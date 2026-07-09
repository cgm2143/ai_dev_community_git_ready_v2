import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ScheduleModule } from '@nestjs/schedule';
import Redis from 'ioredis';
import configuration, { RedisConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { CommonModule } from './common/common.module';
import { LoggerModule } from './infra/logger/logger.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { QueueModule } from './infra/queue/queue.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { EmailVerifiedGuard } from './common/guards/email-verified.guard';
import { IpBanGuard } from './common/guards/ip-ban.guard';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BoardsModule } from './modules/boards/boards.module';
import { PostsModule } from './modules/posts/posts.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ReactionsModule } from './modules/reactions/reactions.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdsModule } from './modules/ads/ads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    // 전역 기본 Rate Limit (1분당 100회). 엔드포인트별 세분화는 각 컨트롤러에서 @Throttle()로 오버라이드한다.
    // 저장소는 Redis 기반(ThrottlerStorageRedisService)을 사용한다 - 인메모리 저장소는 인스턴스마다
    // 카운터가 분리되어 다중 인스턴스로 수평 확장 시 실질적인 허용량이 인스턴스 수만큼 늘어나는
    // 문제가 있었다(Auth 단계에서 지적하고 12단계로 미뤄둔 개선사항). Redis로 카운터를 공유하면
    // 인스턴스가 몇 대든 설정한 한도가 정확히 지켜진다.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>('redis');
        const redisClient = new Redis({
          host: redisConfig?.host,
          port: redisConfig?.port,
          password: redisConfig?.password,
        });

        return {
          throttlers: [{ ttl: 60_000, limit: 100 }],
          storage: new ThrottlerStorageRedisService(redisClient),
        };
      },
    }),
    ScheduleModule.forRoot(),
    LoggerModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    CommonModule,
    AuthModule,
    HealthModule,
    UsersModule,
    CategoriesModule,
    BoardsModule,
    AttachmentsModule,
    PostsModule,
    CommentsModule,
    ReactionsModule,
    BookmarksModule,
    SearchModule,
    NotificationsModule,
    ReportsModule,
    AdminModule,
    AdsModule,
  ],
  providers: [
    // 실행 순서: IpBanGuard -> ThrottlerGuard -> JwtAuthGuard -> RolesGuard -> PermissionsGuard -> EmailVerifiedGuard
    { provide: APP_GUARD, useClass: IpBanGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: EmailVerifiedGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
