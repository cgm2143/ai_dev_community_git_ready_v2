import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import { RankingService, RANKING_WEIGHTS } from '../../ranking/ranking.service';

const PENDING_KEY_PREFIX = 'post:view-pending:';
const PENDING_IDS_SET = 'post:view-pending-ids';

/**
 * 조회수는 요청마다 DB에 쓰지 않고 Redis에서 집계한 뒤, 1분마다 배치로 DB에 반영한다
 * (1단계 아키텍처에서 확정한 방침).
 *
 * GETSET으로 카운터를 원자적으로 읽고 0으로 리셋하기 때문에, 리셋과 동시에 새 조회가
 * 들어와도 카운트가 유실되지 않는다(다음 사이클에 반영됨).
 *
 * 12단계 랭킹 증분 업데이트: 조회 이벤트도 랭킹 점수에 반영되지만(가중치 0.1로 낮음),
 * 매 조회 요청마다 랭킹을 갱신하면 Redis 왕복이 그만큼 늘어나므로, "이미 배치로 묶이는"
 * 조회수 흐름에 편승시켜 **분당 1회, 포스트당 1회**만 랭킹 증분을 호출한다
 * (개별 조회 이벤트가 아니라 "이번 분에 쌓인 조회수 총합"을 한 번에 반영).
 */
@Injectable()
export class PostViewService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PostViewService.name);
  }

  async recordView(postId: string): Promise<void> {
    // 조회수 집계는 best-effort다. Redis 장애가 게시글 조회(GET /posts/:id)를 500으로
    // 깨뜨리면 안 되므로, 실패해도 로그만 남기고 조용히 넘어간다(원본 게시글은 이미 DB에서 조회됨).
    // incr은 RedisService 래퍼가 이미 degrade 처리하지만, sadd는 원시 client라 함께 감싼다.
    try {
      await this.redis.incr(`${PENDING_KEY_PREFIX}${postId}`);
      await this.redis.client.sadd(PENDING_IDS_SET, postId);
    } catch (error) {
      this.logger.warn({ err: error, postId }, '조회수 집계(Redis)에 실패했습니다. 조회 응답에는 영향 없음.');
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async flushPendingViews(): Promise<void> {
    const postIds = await this.redis.client.smembers(PENDING_IDS_SET);
    if (postIds.length === 0) return;

    for (const postId of postIds) {
      await this.flushOne(postId);
    }
  }

  private async flushOne(postId: string): Promise<void> {
    const key = `${PENDING_KEY_PREFIX}${postId}`;
    const pendingRaw = await this.redis.client.getset(key, '0');
    await this.redis.client.srem(PENDING_IDS_SET, postId);

    const pending = Number(pendingRaw ?? '0');
    if (pending <= 0) return;

    try {
      await this.prisma.post.update({
        where: { id: postId },
        data: { viewCount: { increment: pending } },
      });
      await this.rankingService.applyEngagementDelta(postId, RANKING_WEIGHTS.VIEW * pending);
    } catch (error) {
      // 게시글이 그 사이 삭제되었을 수 있음 - 조회수 반영 실패는 치명적이지 않으므로 로그만 남긴다.
      this.logger.warn({ err: error, postId, pending }, '조회수 배치 반영에 실패했습니다.');
    }
  }
}
