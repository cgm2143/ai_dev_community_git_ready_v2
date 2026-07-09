import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PermissionCode } from '../constants/permission-codes';
import { PermissionCheckService } from '../services/permission-check.service';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../constants/error-codes';
import { AuthenticatedUser } from '../../modules/auth/types/jwt-payload.interface';

/**
 * RBAC의 "Permission" 축을 담당한다 (Role 축은 RolesGuard가 담당).
 * `@RequirePermission(...)`이 붙지 않은 라우트는 그대로 통과시켜, 기존 @Roles만 쓰는
 * 엔드포인트에 영향을 주지 않는다.
 *
 * 실제 role_permissions 조회는 PermissionCheckService에 위임한다 (서비스 레이어의
 * 조건부 인가 로직과 쿼리를 공유하기 위함 - 예: PostsService의 게시글 삭제 권한 체크).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionCheckService: PermissionCheckService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[] | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    const allowed = await this.permissionCheckService.hasAnyPermission(user.role, requiredPermissions);
    if (!allowed) {
      throw new AppException(ErrorCode.FORBIDDEN);
    }

    return true;
  }
}
