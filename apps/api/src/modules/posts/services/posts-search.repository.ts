import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import {
  PostSearchFilters,
  PostSearchSort,
  SearchRepository,
} from '../../search/domain/search-repository.interface';

interface SearchRow {
  id: string;
}

/**
 * 정렬 기준 → ORDER BY 식. 화이트리스트로 고정된 SQL 조각이라(사용자 입력이 식에 끼어들지 않음)
 * 안전하다. 관련도(relevance)는 tsquery(`query`)에 의존하므로 검색 컨텍스트에서만 유효하다.
 */
const ORDER_BY: Record<PostSearchSort, Prisma.Sql> = {
  relevance: Prisma.sql`ts_rank(p.search_vector, query) DESC`,
  latest: Prisma.sql`p.created_at DESC`,
  views: Prisma.sql`p.view_count DESC, p.created_at DESC`,
  likes: Prisma.sql`p.like_count DESC, p.created_at DESC`,
};

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

  /**
   * FTS 매칭 + 선택적 필터(게시판/카테고리/태그) 조건을 하나의 WHERE로 합성한다.
   * 필터는 SQL 안에서 적용되므로(검색 후 메모리 필터링 아님) 페이지네이션과 총 개수가 항상 정확하다.
   * 값은 모두 파라미터 바인딩되어 SQL 인젝션에 안전하다.
   */
  private buildWhere(filters?: PostSearchFilters): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`p.search_vector @@ query`,
      Prisma.sql`p.status = 'PUBLISHED'`,
      Prisma.sql`p.deleted_at IS NULL`,
    ];

    if (filters?.boardId) {
      conditions.push(Prisma.sql`p.board_id = ${filters.boardId}::uuid`);
    }
    if (filters?.categoryId) {
      conditions.push(
        Prisma.sql`p.board_id IN (SELECT id FROM boards WHERE category_id = ${filters.categoryId}::uuid)`,
      );
    }
    if (filters?.tag) {
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM post_tags pt
          JOIN tags t ON t.id = pt.tag_id
          WHERE pt.post_id = p.id AND t.name = ${filters.tag}
        )`,
      );
    }

    return Prisma.join(conditions, ' AND ');
  }

  /** 키워드와 매칭되는 게시글 id를 (필터 적용 후) 정렬 순으로 반환한다. 정렬 미지정 시 관련도(ts_rank). */
  async searchIds(keyword: string, skip: number, take: number, filters?: PostSearchFilters): Promise<string[]> {
    const where = this.buildWhere(filters);
    const orderBy = ORDER_BY[filters?.sort ?? 'relevance'];

    const rows = await this.prisma.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT p.id
      FROM posts p, plainto_tsquery('simple', ${keyword}) query
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${take} OFFSET ${skip}
    `);
    return rows.map((row) => row.id);
  }

  async countMatches(keyword: string, filters?: PostSearchFilters): Promise<number> {
    const where = this.buildWhere(filters);

    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM posts p, plainto_tsquery('simple', ${keyword}) query
      WHERE ${where}
    `);
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
