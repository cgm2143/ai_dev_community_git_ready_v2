import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

export type RankingPeriod = 'daily' | 'weekly' | 'monthly';

const PERIOD_WINDOW_HOURS: Record<RankingPeriod, number> = {
  daily: 24,
  weekly: 24 * 7,
  monthly: 24 * 30,
};

const RANKING_KEY_PREFIX = 'ranking:posts:';

/** 이벤트 종류별 참여도 가중치. 점수식 분자를 구성한다. */
export const RANKING_WEIGHTS = {
  LIKE: 3,
  COMMENT: 2,
  VIEW: 0.1,
} as const;

/**
 * 시간 가중치 인기글 랭킹. 원본 기획서의 "시간 가중치를 적용하여 인기글 선정 -
 * 오늘의 인기 / 주간 인기 / 월간 인기" 요구사항을 구현한다.
 *
 * 점수식: score = (추천수*3 + 댓글수*2 + 조회수*0.1) / (경과시간(h) + 2)^1.5
 *
 * ## 설계: 증분 업데이트 + 주기적 전체 재검증(2단계 구조)
 *
 * 1) **증분 업데이트(이 서비스의 `applyEngagementDelta`)**: 추천/댓글/조회 이벤트가 발생한
 *    "그 순간"의 나이(ageHours)를 기준으로 점수 변화분만 계산해 ZSET에 `ZINCRBY`한다.
 *    이벤트가 발생한 게시글 하나만 건드리므로 매우 저렴하고, 사용자 반응이 거의 실시간으로
 *    랭킹에 반영된다.
 *    한계: ZINCRBY 이후에도 시간은 계속 흐르므로(분모가 계속 커짐), 증분 갱신만으로는
 *    "그 사이 아무 반응도 없었던 게시글들과의 상대적 순위"가 시간이 지날수록 조금씩 어긋난다.
 *
 * 2) **주기적 전체 재검증(`recalculateAll`, BullMQ 스케줄 작업이 호출)**: 모든 후보 게시글의
 *    점수를 현재 시각 기준으로 처음부터 다시 계산해 ZSET을 통째로 교체한다. 증분 갱신으로
 *    누적된 오차를 주기적으로 바로잡는 "검증/보정" 역할이다. 이 작업은 무겁기 때문에 매 요청
 *    경로가 아니라 BullMQ의 반복 작업(QueueModule)이 백그라운드에서 수행한다.
 */
@Injectable()
export class RankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RankingService.name);
  }

  /**
   * 추천/댓글/조회 등 참여도 이벤트 발생 시 호출한다. weightDelta는 부호를 가질 수 있다
   * (예: 추천 취소는 -RANKING_WEIGHTS.LIKE). 게시글이 이미 랭킹 대상 기간(최대 월간 30일)을
   * 벗어났으면 아무 것도 하지 않는다 - 오래된 글이 갑자기 랭킹에 재진입하는 것을 막는다.
   */
  async applyEngagementDelta(postId: string, weightDelta: number): Promise<void> {
    if (weightDelta === 0) return;

    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { createdAt: true } });
    if (!post) return;

    const ageHours = this.ageInHours(post.createdAt);
    if (ageHours > PERIOD_WINDOW_HOURS.monthly) return;

    const decay = this.decayFactor(ageHours);
    const scoreDelta = weightDelta / decay;

    const periods: RankingPeriod[] = ['monthly'];
    if (ageHours <= PERIOD_WINDOW_HOURS.weekly) periods.push('weekly');
    if (ageHours <= PERIOD_WINDOW_HOURS.daily) periods.push('daily');

    await Promise.all(periods.map((period) => this.redis.zIncrBy(this.keyFor(period), scoreDelta, postId)));
  }

  /**
   * 전체 재검증. BullMQ의 반복 작업(QueueModule의 RankingRecalculationWorker)이 주기적으로
   * 호출한다. 최근 30일 이내 게시글 전체의 점수를 현재 시각 기준으로 다시 계산해
   * 세 ZSET을 통째로 교체한다.
   */
  async recalculateAll(): Promise<{ candidatePosts: number; daily: number; weekly: number; monthly: number }> {
    const monthAgo = new Date(Date.now() - PERIOD_WINDOW_HOURS.monthly * 60 * 60 * 1000);

    const posts = await this.prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED, deletedAt: null, createdAt: { gte: monthAgo } },
      select: { id: true, likeCount: true, commentCount: true, viewCount: true, createdAt: true },
    });

    const buckets: Record<RankingPeriod, Array<{ score: number; member: string }>> = {
      daily: [],
      weekly: [],
      monthly: [],
    };

    for (const post of posts) {
      const ageHours = this.ageInHours(post.createdAt);
      const score = this.computeAbsoluteScore(post.likeCount, post.commentCount, post.viewCount, ageHours);
      const entry = { score, member: post.id };

      buckets.monthly.push(entry);
      if (ageHours <= PERIOD_WINDOW_HOURS.weekly) buckets.weekly.push(entry);
      if (ageHours <= PERIOD_WINDOW_HOURS.daily) buckets.daily.push(entry);
    }

    await Promise.all(
      (Object.keys(buckets) as RankingPeriod[]).map((period) => this.replaceRankingSet(period, buckets[period])),
    );

    const result = {
      candidatePosts: posts.length,
      daily: buckets.daily.length,
      weekly: buckets.weekly.length,
      monthly: buckets.monthly.length,
    };
    this.logger.info(result, '인기글 랭킹 전체 재검증을 완료했습니다.');
    return result;
  }

  async getTopPostIds(period: RankingPeriod, limit: number): Promise<string[]> {
    const scored = await this.redis.zRevRangeWithScores(this.keyFor(period), 0, limit - 1);
    return scored.map((row) => row.member);
  }

  /** recalculateAll 전용 - 현재 누적 카운터로부터 "절대 점수"를 처음부터 계산한다. */
  private computeAbsoluteScore(likeCount: number, commentCount: number, viewCount: number, ageHours: number): number {
    const engagement = likeCount * RANKING_WEIGHTS.LIKE + commentCount * RANKING_WEIGHTS.COMMENT + viewCount * RANKING_WEIGHTS.VIEW;
    return engagement / this.decayFactor(ageHours);
  }

  private decayFactor(ageHours: number): number {
    return Math.pow(ageHours + 2, 1.5);
  }

  private ageInHours(createdAt: Date): number {
    return (Date.now() - createdAt.getTime()) / (60 * 60 * 1000);
  }

  private async replaceRankingSet(period: RankingPeriod, entries: Array<{ score: number; member: string }>) {
    const key = this.keyFor(period);
    await this.redis.delete(key);
    if (entries.length > 0) {
      await this.redis.zAddMany(key, entries);
    }
  }

  private keyFor(period: RankingPeriod): string {
    return `${RANKING_KEY_PREFIX}${period}`;
  }
}
