import { Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';

/**
 * 차단 관계의 단일 진실 공급원(source of truth).
 *
 * 설계 의도: "차단"을 관계 하나로만 표현하고(POST/COMMENT 숨김, 쪽지 차단, 알림 차단 모두
 * 이 하나의 관계를 근거로 판단), 각 기능(Posts/Comments 목록 필터링, Chat DM 허용 여부,
 * Notifications 발송 여부)이 이 서비스의 isBlocked()/getBlockedUserIds()만 호출하도록 한다.
 * 이렇게 하면 새로운 차단 적용 대상이 생겨도(예: 4단계 Posts, 8단계 Notifications) 이 서비스와
 * user_blocks 테이블을 건드리지 않고 호출부만 추가하면 된다.
 *
 * 현재는 세분화된 차단 범위(콘텐츠만/쪽지만 등)를 두지 않고 "전체 차단" 하나로 단순화했다.
 * 세분화가 실제로 필요해지면(예: "쪽지는 허용하되 게시글만 숨기고 싶다") 이 서비스의 시그니처를
 * 유지한 채 `user_blocks`에 scope 컬럼을 추가하고 이 서비스 내부 구현만 확장하면 된다.
 */
@Injectable()
export class BlockService {
  constructor(private readonly prisma: PrismaService) {}

  async block(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new AppException(ErrorCode.CANNOT_BLOCK_SELF);
    }

    const target = await this.prisma.user.findUnique({ where: { id: blockedId } });
    if (!target || target.status === UserStatus.WITHDRAWN) {
      throw new AppException(ErrorCode.USER_NOT_FOUND);
    }

    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
  }

  /** 차단 목록에 없어도 에러 없이 조용히 종료한다 (멱등). */
  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const found = await this.prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    return found !== null;
  }

  /**
   * blockerId가 차단한 모든 사용자의 id 목록.
   * Posts/Comments 목록 조회 시 `WHERE author_id NOT IN (...)` 형태로 필터링하는 데 사용한다
   * (실제 적용은 해당 도메인 모듈 구현 단계에서 진행).
   */
  async getBlockedUserIds(blockerId: string): Promise<string[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId },
      select: { blockedId: true },
    });
    return rows.map((row: { blockedId: string }) => row.blockedId);
  }

  async listBlockedUsers(blockerId: string) {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
      include: {
        blocked: {
          select: { id: true, nickname: true, profileImageUrl: true },
        },
      },
    });

    return rows.map(
      (row: {
        createdAt: Date;
        blocked: { id: string; nickname: string; profileImageUrl: string | null };
      }) => ({
        id: row.blocked.id,
        nickname: row.blocked.nickname,
        profileImageUrl: row.blocked.profileImageUrl,
        blockedAt: row.createdAt,
      }),
    );
  }
}
