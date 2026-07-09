import { Global, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisConfig } from '../../config/configuration';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

const redisClientProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis => {
    const redisConfig = configService.get<RedisConfig>('redis');
    const logger = new Logger('RedisClient');

    const client = new Redis({
      host: redisConfig?.host,
      port: redisConfig?.port,
      password: redisConfig?.password,
      // 컨테이너 재기동/네트워크 순단에도 지수 백오프로 재연결
      retryStrategy: (attempt: number) => Math.min(attempt * 200, 3000),
      maxRetriesPerRequest: 3,
    });

    client.on('connect', () => logger.log('Redis에 연결되었습니다.'));
    client.on('error', (error) => logger.error(`Redis 연결 오류: ${error.message}`));

    return client;
  },
};

@Global()
@Module({
  providers: [redisClientProvider, RedisService],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(private readonly redisService: RedisService) {}

  async onModuleDestroy(): Promise<void> {
    await this.redisService.client.quit();
  }
}
