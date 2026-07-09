import { Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { PostsService } from '../posts/posts.service';

const POPULAR_TERMS_KEY = 'search:popular-terms';

/**
 * 게시글 검색은 4단계에서 이미 구현한 `PostsService.findAll({ keyword })`(내부적으로
 * `SearchRepository` 구현체인 `PostsSearchRepository`를 사용)를 그대로 재사용한다.
 * 회원/태그/게시판 검색은 별도의 tsvector 컬럼이 없는 단순한 대상이라, Prisma의
 * `contains`(ILIKE) 검색으로 충분하다고 판단해 raw 쿼리를 추가하지 않았다.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly postsService: PostsService,
  ) {}

  async searchPosts(q: string, page: number, limit: number, viewerId?: string) {
    await this.recordSearchTerm(q);
    return this.postsService.findAll({ keyword: q, page, limit }, viewerId);
  }

  async searchUsers(q: string, page: number, limit: number) {
    const where = {
      nickname: { contains: q, mode: 'insensitive' as const },
      status: UserStatus.ACTIVE,
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { nickname: true, profileImageUrl: true, bio: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nickname: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: users, meta: { page, limit, total } };
  }

  async searchTags(q: string, limit: number) {
    const tags = await this.prisma.tag.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { name: true, usageCount: true },
      orderBy: { usageCount: 'desc' },
      take: limit,
    });
    return tags;
  }

  async searchBoards(q: string, limit: number) {
    const boards = await this.prisma.board.findMany({
      where: { name: { contains: q, mode: 'insensitive' }, isActive: true },
      select: { name: true, slug: true, description: true },
      take: limit,
    });
    return boards;
  }

  /**
   * 관련도 기반 자동완성. 제목 후보는 `PostsService.autocompleteTitles()`(내부적으로
   * `SearchRepository` 구현체의 접두어 tsquery + ts_rank 정렬)를 통해서만 가져온다 -
   * 이 서비스는 검색 엔진이 PostgreSQL FTS인지 나중에 OpenSearch로 바뀌는지 알 필요가 없다.
   */
  async autocomplete(q: string, limit: number) {
    await this.recordSearchTerm(q);

    const [posts, tags] = await Promise.all([
      this.postsService.autocompleteTitles(q, limit),
      this.prisma.tag.findMany({
        where: { name: { startsWith: q.toLowerCase(), mode: 'insensitive' } },
        select: { name: true },
        orderBy: { usageCount: 'desc' },
        take: limit,
      }),
    ]);

    return { posts, tags: tags.map((tag) => tag.name) };
  }

  /** 검색어별 누적 검색 횟수를 Redis ZSET에 집계한다 - "인기 검색어" 기능(원본 기획서)의 데이터 소스. */
  private async recordSearchTerm(q: string): Promise<void> {
    const normalized = q.trim().toLowerCase();
    if (!normalized) return;
    await this.redis.zIncrBy(POPULAR_TERMS_KEY, 1, normalized);
  }

  async getPopularTerms(limit: number) {
    const scored = await this.redis.zRevRangeWithScores(POPULAR_TERMS_KEY, 0, limit - 1);
    return scored.map(({ member, score }) => ({ term: member, score }));
  }
}
