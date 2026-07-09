import { Module } from '@nestjs/common';
import { BlockService } from './block.service';

/**
 * 다른 모듈(Users, 그리고 이후 Posts/Comments/Chat/Notifications)이 BlockService만
 * 주입받아 쓸 수 있도록 독립 모듈로 분리했다. Users 도메인에 종속시키지 않는 이유는,
 * 채팅/알림 모듈이 "회원 프로필" 기능 전체(UsersModule)를 끌어올 필요 없이
 * 차단 여부 확인 기능만 가져다 쓸 수 있게 하기 위함이다.
 */
@Module({
  providers: [BlockService],
  exports: [BlockService],
})
export class BlocksModule {}
