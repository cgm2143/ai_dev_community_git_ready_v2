import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminAuditLogService } from '../../../common/services/admin-audit-log.service';
import { PermissionCheckService } from '../../../common/services/permission-check.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';
import { QueryAdminUserDto } from './dto/admin-user.dto';

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  nickname: true,
  status: true,
  role: { select: { name: true } },
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AdminAuditLogService,
    private readonly permissionCheckService: PermissionCheckService,
  ) {}

  async findAll(query: QueryAdminUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UserWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { nickname: { contains: query.keyword, mode: 'insensitive' } },
              { email: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status as UserStatus } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: ADMIN_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((u) => this.toResponse(u)),
      meta: { page, limit, total },
    };
  }

  async updateStatus(adminId: string, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    if (adminId === userId) {
      throw new AppException(ErrorCode.CANNOT_MODIFY_SELF_ROLE, '본인 계정의 상태는 스스로 변경할 수 없습니다.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === UserStatus.WITHDRAWN) {
      throw new AppException(ErrorCode.USER_NOT_FOUND);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: status as UserStatus },
      select: ADMIN_USER_SELECT,
    });

    if (status === 'SUSPENDED') {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.auditLog.record({
      adminId,
      action: status === 'SUSPENDED' ? 'USER_SUSPEND' : 'USER_ACTIVATE',
      targetType: 'USER',
      targetId: userId,
    });

    return this.toResponse(updated);
  }

  /**
   * SUPER_ADMIN 승격 제한 정책: SUPER_ADMIN 권한은 오직 SUPER_ADMIN만 부여할 수 있다.
   * 일반 ADMIN이 다른 사람(또는 자기 자신 - 이미 위에서 차단됨)을 SUPER_ADMIN으로
   * 승격시키는 것을 막아, 권한 상승(privilege escalation) 경로를 원천 차단한다.
   * requesterRole은 컨트롤러가 JWT의 AuthenticatedUser.role을 그대로 전달한다
   * (매 요청마다 JwtStrategy가 DB에서 재확인한 최신 역할이므로 신뢰할 수 있다).
   */
  async updateRole(adminId: string, requesterRole: string, userId: string, roleName: string) {
    if (adminId === userId) {
      throw new AppException(ErrorCode.CANNOT_MODIFY_SELF_ROLE);
    }

    if (roleName === 'SUPER_ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      throw new AppException(ErrorCode.CANNOT_GRANT_SUPER_ADMIN);
    }

    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } }),
      this.prisma.role.findUnique({ where: { name: roleName } }),
    ]);

    if (!user || user.status === UserStatus.WITHDRAWN) {
      throw new AppException(ErrorCode.USER_NOT_FOUND);
    }
    if (!role) {
      throw new AppException(ErrorCode.ROLE_NOT_FOUND);
    }

    const previousRoleName = user.role.name;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      select: ADMIN_USER_SELECT,
    });

    // 권한 캐시는 역할명을 키로 하므로(사용자별이 아님), 이 변경으로 영향을 받을 수 있는
    // 이전 역할/새 역할 두 캐시를 모두 즉시 비운다 - 관리자가 권한을 바꾼 직후 바로 반영되도록.
    await Promise.all([
      this.permissionCheckService.invalidateRole(previousRoleName),
      this.permissionCheckService.invalidateRole(roleName),
    ]);

    await this.auditLog.record({
      adminId,
      action: 'USER_ROLE_CHANGE',
      targetType: 'USER',
      targetId: userId,
      meta: { previousRole: previousRoleName, newRole: roleName },
    });

    return this.toResponse(updated);
  }

  private toResponse(user: {
    id: string;
    email: string;
    nickname: string;
    status: UserStatus;
    role: { name: string };
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      status: user.status,
      role: user.role.name,
      emailVerified: user.emailVerifiedAt !== null,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
