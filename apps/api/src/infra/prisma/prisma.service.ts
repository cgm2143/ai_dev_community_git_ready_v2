import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient를 NestJS 라이프사이클에 맞춰 연결/해제한다.
 * 모든 도메인 모듈은 PrismaClient를 직접 import하지 않고 이 서비스를 주입받아 사용한다.
 * (2단계 결정: Repository 패턴은 Post/Comment/Notification/Chat 등 복잡한 도메인에만 선택 적용,
 *  단순 도메인은 서비스에서 이 PrismaService를 직접 사용한다.)
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    // Prisma의 이벤트 기반 로그를 Nest 로거로 연결 (타입 선언은 log 옵션과 맞춰 별도 캐스팅 없이 any 회피를 위해 on을 그대로 사용)
    this.$on('warn' as never, (event: unknown) => this.logger.warn(event));
    this.$on('error' as never, (event: unknown) => this.logger.error(event));

    await this.$connect();
    this.logger.log('Prisma가 데이터베이스에 연결되었습니다.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
