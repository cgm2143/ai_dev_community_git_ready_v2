import type { ConnectionOptions } from 'bullmq';
import { RedisConfig } from '../../config/configuration';

/**
 * BullMQ 커넥션 옵션. BullMQ가 번들한 ioredis와 프로젝트 최상위 ioredis의 타입 충돌을 피하기 위해
 * 인스턴스 대신 순수 옵션 객체를 넘긴다. `maxRetriesPerRequest: null`은 Worker의 블로킹 커맨드 필수 설정이다.
 */
export function createBullConnectionOptions(redisConfig: RedisConfig | undefined): ConnectionOptions {
  return {
    host: redisConfig?.host,
    port: redisConfig?.port,
    password: redisConfig?.password,
    maxRetriesPerRequest: null,
  };
}
