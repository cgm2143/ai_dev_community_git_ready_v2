import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

export type MessageHandler = (channel: string, message: string) => void;

/**
 * ioredis 클라이언트를 용도별 인터페이스로 감싼다.
 * 원시 클라이언트를 직접 노출하지 않고, 아래 세 그룹으로 나눠 필요한 만큼만 확장한다.
 *
 * 1) Cache  - 세션/Refresh Token 캐시, 일반 key-value 캐싱
 * 2) SortedSet(ZSET) - 인기글 랭킹(시간 가중치 점수), 실시간 순위 등
 * 3) Pub/Sub - 실시간 알림, 다중 인스턴스 간 WebSocket 브로드캐스트(1단계 결정: 초기엔 통합,
 *              추후 WebSocket Gateway를 별도 프로세스로 분리할 때 이 Pub/Sub이 그 연결고리가 된다)
 *
 * Pub/Sub은 구독(subscribe) 시 커넥션이 전용 모드로 전환되어 일반 명령을 실행할 수 없으므로,
 * ioredis의 duplicate()로 발행용/구독용 커넥션을 분리한다.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private subscriberClient: Redis | null = null;
  private readonly channelHandlers = new Map<string, Set<MessageHandler>>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RedisService.name);
  }

  /** 원시 ioredis 클라이언트가 꼭 필요한 예외적인 경우(파이프라인/트랜잭션 등)에만 사용 */
  get client(): Redis {
    return this.redisClient;
  }

  /**
   * Redis는 캐시/부가 기능 계층이므로, 명령 실패(연결 끊김/타임아웃 등)가 사용자 요청을
   * 500으로 깨뜨려서는 안 된다. 원본 데이터는 항상 DB(source of truth)에 있으므로:
   *  - 읽기는 안전한 기본값(null/[]/false 등)으로 degrade → 호출부는 "캐시 미스"처럼 DB fallback.
   *  - 쓰기는 no-op(best-effort)으로 degrade.
   * 어느 쪽이든 에러 로그를 남겨 장애를 관측 가능하게 한다(헬스체크는 client.ping을 직접 써서
   * Redis 다운을 그대로 보고하므로 이 래퍼의 영향을 받지 않는다).
   */
  private async safe<T>(op: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      this.logger.error({ err, op }, `Redis 명령 실패 - fallback으로 degrade (${op})`);
      return fallback;
    }
  }

  // ===================== Cache =====================

  async get(key: string): Promise<string | null> {
    return this.safe('get', () => this.redisClient.get(key), null);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.safe<unknown>(
      'set',
      () => (ttlSeconds ? this.redisClient.set(key, value, 'EX', ttlSeconds) : this.redisClient.set(key, value)),
      null,
    );
  }

  /**
   * JSON 직렬화가 필요한 값을 다루는 편의 메서드. 캐시 계층 도입 시(예: 게시판 목록 캐싱)
   * 매번 JSON.stringify/parse를 반복하지 않도록 한다.
   */
  async getJson<T>(key: string): Promise<T | null> {
    return this.safe<T | null>(
      'getJson',
      async () => {
        const raw = await this.redisClient.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      },
      null,
    );
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.safe<unknown>(
      'setJson',
      () => {
        const serialized = JSON.stringify(value);
        return ttlSeconds
          ? this.redisClient.set(key, serialized, 'EX', ttlSeconds)
          : this.redisClient.set(key, serialized);
      },
      null,
    );
  }

  async delete(key: string): Promise<number> {
    return this.safe('delete', () => this.redisClient.del(key), 0);
  }

  /**
   * 패턴에 매칭되는 모든 키를 삭제한다 (예: `permission-check:ADMIN:*`).
   * `KEYS`는 전체 키 공간을 블로킹 방식으로 스캔해 운영 환경에서 위험하므로,
   * 논블로킹 커서 방식인 `SCAN`을 사용한다. 권한 캐시 무효화처럼 "역할 하나에 대한
   * 여러 권한 조합 캐시를 한 번에 지워야 하는" 상황에 사용한다.
   */
  async deleteByPattern(pattern: string): Promise<number> {
    return this.safe(
      'deleteByPattern',
      async () => {
        const stream = this.redisClient.scanStream({ match: pattern, count: 100 });
        let deletedCount = 0;
        for await (const keys of stream as AsyncIterable<string[]>) {
          if (keys.length === 0) continue;
          deletedCount += await this.redisClient.del(...keys);
        }
        return deletedCount;
      },
      0,
    );
  }

  async exists(key: string): Promise<boolean> {
    return this.safe('exists', async () => (await this.redisClient.exists(key)) > 0, false);
  }

  /** 초 단위 남은 TTL. 키가 없으면 -2, TTL이 설정되어 있지 않으면 -1 (ioredis/Redis 규약 그대로 반환). 실패 시에도 -2(키 없음처럼) */
  async ttl(key: string): Promise<number> {
    return this.safe('ttl', () => this.redisClient.ttl(key), -2);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.safe<unknown>('expire', () => this.redisClient.expire(key, ttlSeconds), null);
  }

  async incr(key: string): Promise<number> {
    return this.safe('incr', () => this.redisClient.incr(key), 0);
  }

  // ===================== Sorted Set (랭킹) =====================

  /** score를 그대로 설정 (기존 값 덮어씀) - 예: 게시글 인기 점수 초기화 */
  async zAdd(key: string, score: number, member: string): Promise<void> {
    await this.safe<unknown>('zAdd', () => this.redisClient.zadd(key, score, member), null);
  }

  /**
   * 여러 (score, member) 쌍을 한 번의 왕복으로 저장한다. 랭킹 재계산처럼 수백~수천 개의
   * 멤버를 한꺼번에 갱신해야 할 때, 매 멤버마다 zAdd를 호출하면 네트워크 왕복이 그만큼
   * 누적되므로(12단계 성능 최적화 대상), ioredis의 다중 인자 ZADD로 한 번에 처리한다.
   */
  async zAddMany(key: string, entries: Array<{ score: number; member: string }>): Promise<void> {
    if (entries.length === 0) return;
    const args: Array<string | number> = [];
    for (const entry of entries) {
      args.push(entry.score, entry.member);
    }
    await this.safe<unknown>('zAddMany', () => this.redisClient.zadd(key, ...args), null);
  }

  /** 기존 score에 delta를 더함 - 예: 추천 발생 시 +10점 실시간 반영 */
  async zIncrBy(key: string, delta: number, member: string): Promise<number> {
    return this.safe('zIncrBy', async () => Number(await this.redisClient.zincrby(key, delta, member)), 0);
  }

  async zScore(key: string, member: string): Promise<number | null> {
    return this.safe<number | null>(
      'zScore',
      async () => {
        const result = await this.redisClient.zscore(key, member);
        return result === null ? null : Number(result);
      },
      null,
    );
  }

  /** 점수 내림차순 상위 N개 (인기글 랭킹 조회에 사용) */
  async zRevRangeWithScores(key: string, start: number, stop: number): Promise<Array<{ member: string; score: number }>> {
    return this.safe(
      'zRevRangeWithScores',
      async () => this.pairsToScored(await this.redisClient.zrevrange(key, start, stop, 'WITHSCORES')),
      [] as Array<{ member: string; score: number }>,
    );
  }

  async zRemove(key: string, member: string): Promise<void> {
    await this.safe<unknown>('zRemove', () => this.redisClient.zrem(key, member), null);
  }

  /** 오래된 랭킹 데이터 정리(예: 어제 이전 일간 랭킹 키 자체를 TTL로 만료시키는 방식을 권장하되, 특정 구간만 지울 때 사용) */
  async zRemoveRangeByScore(key: string, min: number, max: number): Promise<void> {
    await this.safe<unknown>('zRemoveRangeByScore', () => this.redisClient.zremrangebyscore(key, min, max), null);
  }

  private pairsToScored(raw: string[]): Array<{ member: string; score: number }> {
    const result: Array<{ member: string; score: number }> = [];
    for (let i = 0; i < raw.length; i += 2) {
      result.push({ member: raw[i], score: Number(raw[i + 1]) });
    }
    return result;
  }

  // ===================== Pub/Sub =====================

  async publish(channel: string, message: string): Promise<number> {
    // 발행 실패가 이를 유발한 행동(댓글/좋아요/신고 → 알림 생성)을 500으로 깨뜨리면 안 되므로 best-effort.
    return this.safe('publish', () => this.redisClient.publish(channel, message), 0);
  }

  async publishJson<T>(channel: string, payload: T): Promise<number> {
    return this.publish(channel, JSON.stringify(payload));
  }

  /**
   * 채널 구독. 동일 채널에 여러 핸들러를 등록할 수 있고(Set으로 관리),
   * 실제 ioredis subscribe는 채널당 최초 1회만 호출한다.
   * WebSocket Gateway가 여러 인스턴스로 스케일 아웃될 때, 각 인스턴스가 이 메서드로
   * 알림 채널을 구독해두면 어느 인스턴스가 발행하든 전체 인스턴스가 수신할 수 있다.
   */
  async subscribe(channel: string, handler: MessageHandler): Promise<void> {
    const isFirstHandlerForChannel = !this.channelHandlers.has(channel);
    const handlers = this.channelHandlers.get(channel) ?? new Set<MessageHandler>();
    handlers.add(handler);
    this.channelHandlers.set(channel, handlers);

    if (isFirstHandlerForChannel) {
      await this.ensureSubscriberClient().subscribe(channel);
    }
  }

  async unsubscribe(channel: string, handler: MessageHandler): Promise<void> {
    const handlers = this.channelHandlers.get(channel);
    if (!handlers) return;

    handlers.delete(handler);
    if (handlers.size === 0) {
      this.channelHandlers.delete(channel);
      await this.subscriberClient?.unsubscribe(channel);
    }
  }

  private ensureSubscriberClient(): Redis {
    if (!this.subscriberClient) {
      this.subscriberClient = this.redisClient.duplicate();
      this.subscriberClient.on('message', (channel: string, message: string) => {
        this.channelHandlers.get(channel)?.forEach((handler) => handler(channel, message));
      });
      this.subscriberClient.on('error', (error) => this.logger.error({ err: error }, 'Redis 구독 커넥션 오류'));
    }
    return this.subscriberClient;
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriberClient?.quit();
  }
}

