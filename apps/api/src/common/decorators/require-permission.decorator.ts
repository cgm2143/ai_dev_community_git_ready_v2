import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '../constants/permission-codes';

export const REQUIRE_PERMISSION_KEY = 'requirePermissions';

/**
 * @RequirePermission(PermissionCode.BOARD_MANAGE)
 *
 * Role(역할)이 "어떤 부류의 사용자인가"를 구분한다면, Permission은 "그 역할이 실제로
 * 무엇을 할 수 있는가"를 세분화한다. 예를 들어 MODERATOR 역할은 게시글/댓글 삭제,
 * 신고 처리 권한은 있지만 게시판 관리(BOARD_MANAGE) 권한은 없는 식으로 세분화할 수 있다
 * (`prisma/seed.ts`의 ROLE_PERMISSIONS 매핑 참고).
 *
 * 여러 권한 코드를 넘기면 "그 중 하나라도 있으면 통과"로 판단한다(OR 조건).
 * @Roles()와 함께 사용하면 "역할 필터 -> 권한 필터" 2중 검사가 되며,
 * 이미 @Roles로 충분히 좁혀진 엔드포인트에서도 향후 권한 매핑만 바꿔서
 * 접근 범위를 조정할 수 있도록 미리 붙여두는 것을 권장한다.
 */
export const RequirePermission = (...permissions: PermissionCode[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
