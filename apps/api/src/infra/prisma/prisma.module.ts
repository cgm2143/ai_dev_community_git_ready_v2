import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global 로 등록해 모든 도메인 모듈이 별도 import 없이 PrismaService를 주입받을 수 있게 한다.
 * (Prisma는 앱 전역에서 단일 커넥션 풀을 공유하는 것이 정석이므로 Global 처리가 합리적이다.)
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
