/**
 * `permissions` 테이블의 code 값과 1:1 대응하는 상수.
 * 새 권한이 필요하면 여기에 추가한 뒤 `prisma/seed.ts`의 PERMISSIONS 배열과
 * ROLE_PERMISSIONS 매핑에도 함께 반영해야 한다 (이 상수 자체가 DB 값을 생성하지는 않음).
 */
export enum PermissionCode {
  POST_DELETE_ANY = 'POST_DELETE_ANY',
  COMMENT_DELETE_ANY = 'COMMENT_DELETE_ANY',
  REPORT_RESOLVE = 'REPORT_RESOLVE',
  USER_BAN = 'USER_BAN',
  BOARD_MANAGE = 'BOARD_MANAGE',
  AD_MANAGE = 'AD_MANAGE',
  SETTING_MANAGE = 'SETTING_MANAGE',
}
