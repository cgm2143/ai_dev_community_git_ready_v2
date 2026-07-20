import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { LoggerModule } from './infra/logger/logger.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { QueueModule } from './infra/queue/queue.module';
import { WorkerModule } from './worker/worker.module';

/**
 * Worker 프로세스 전용 루트 모듈. HTTP 서버/가드/인터셉터/스로틀러 없이,
 * 워커 구동에 필요한 인프라(Config/Logger/Prisma/Redis/Queue)와 WorkerModule만 로드한다.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),
    LoggerModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    WorkerModule,
  ],
})
export class WorkerAppModule {}
