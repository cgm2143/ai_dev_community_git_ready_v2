import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * @Roles('ADMIN', 'SUPER_ADMIN')
 * RolesGuard와 함께 사용한다. JwtAuthGuard가 먼저 통과해 request.user가 채워진 상태를 전제로 한다.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
