import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { SearchRepository } from '../../search/domain/search-repository.interface';

interface SearchRow {
  id: string;
}

/**
 * `SearchRepository` 인터페이스의 PostgreSQL(FTS) 구현체 (7단계에서 정식 승격).
 * `posts.search_vector`(생성 컬럼, migrations_manual/02_fts_setup.sql)를 대상으로
 * `plainto_tsquery`로 매칭하고 `ts_rank`로 정렬한다. Prisma 스키마는 이 컬럼을 모르므로
 * 반드시 `$queryRaw`로만 접근한다.
 *
 * 향후 OpenSearch로 전환할 때는 동일 인터페이스의 `OpenSearchPostsRepository`를 새로 만들어
 * DI 토큰만 바꾸면 되고, `PostsService`는 `SearchRepository` 인터페이스만 알기 때문에
 * 전혀 변경할 필요가 없다.
 */
@Injectable()
export class PostsSearchRepository implements SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 키워드와 매칭되는 게시글 id를 관련도(rank) 순으로 반환한다. */
  async searchIds(keyword: string, skip: number, take: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<SearchRow[]>`
      SELECT id
      FROM posts, plainto_tsquery('simple', ${keyword}) query
      WHERE search_vector @@ query
        AND status = 'PUBLISHED'
        AND deleted_at IS NULL
      ORDER BY ts_rank(search_vector, query) DESC
      LIMIT ${take} OFFSET ${skip}
    `;
    return rows.map((row) => row.id);
  }

  async countMatches(keyword: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count
      FROM posts, plainto_tsquery('simple', ${keyword}) query
      WHERE search_vector @@ query
        AND status = 'PUBLISHED'
        AND deleted_at IS NULL
    `;
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * 자동완성용 제목 후보를 관련도 순으로 반환한다.
   * `plainto_tsquery`는 어간(lexeme) 단위 완전 일치만 지원해 "타이핑 중" 시나리오(prefix)에는
   * 적합하지 않으므로, `to_tsquery`의 `:*` 접두어 연산자로 직접 쿼리를 구성한다.
   * 정렬은 (1) ts_rank 관련도 내림차순 -> (2) 동점 시 최신순(createdAt desc) 2단계로 처리해,
   * "제목 일치도를 우선하고 동률이면 최신 글을 우선"하는 요구사항을 그대로 반영한다.
   */
  async autocompleteTitles(prefix: string, limit: number): Promise<Array<{ id: string; title: string }>> {
    const tsQuery = this.buildPrefixTsQuery(prefix);
    if (!tsQuery) {
      return [];
    }

    return this.prisma.$queryRaw<Array<{ id: string; title: string }>>`
      SELECT id, title
      FROM posts, to_tsquery('simple', ${tsQuery}) query
      WHERE search_vector @@ query
        AND status = 'PUBLISHED'
        AND deleted_at IS NULL
      ORDER BY ts_rank(search_vector, query) DESC, created_at DESC
      LIMIT ${limit}
    `;
  }

  /**
   * 사용자 입력을 `word1:* & word2:* ...` 형태의 안전한 to_tsquery 문자열로 변환한다.
   * 특수문자(`&`, `|`, `:`, `(` 등)를 그대로 넘기면 to_tsquery 문법 오류가 발생할 수 있으므로,
   * 단어 문자(유니코드 letter/digit)만 추출해 토큰화한 뒤 접두어 연산자를 붙인다.
   * 유효한 토큰이 하나도 없으면 null을 반환해 호출부가 쿼리 자체를 건너뛰게 한다.
   */
  private buildPrefixTsQuery(input: string): string | null {
    const tokens = input
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      return null;
    }

    return tokens.map((token) => `${token}:*`).join(' & ');
  }
}
