# AI 개발자 커뮤니티 — Category/Board 최종 반영 (PermissionsGuard 추가)

지시하신 3가지 방향을 모두 반영했습니다.

---

## 1. PermissionsGuard — Role/Permission 이중 축 RBAC

### 구조
- `src/common/constants/permission-codes.ts`: `PermissionCode` enum (`POST_DELETE_ANY`, `COMMENT_DELETE_ANY`, `REPORT_RESOLVE`, `USER_BAN`, `BOARD_MANAGE`, `AD_MANAGE`, `SETTING_MANAGE`) — `prisma/seed.ts`의 PERMISSIONS 배열과 1:1 대응
- `src/common/decorators/require-permission.decorator.ts`: `@RequirePermission(PermissionCode.BOARD_MANAGE)` — 여러 개 넘기면 OR 조건(하나라도 있으면 통과)
- `src/common/guards/permissions.guard.ts`: `role_permissions` 테이블을 조인 조회해 현재 사용자의 역할이 요구 권한을 가지고 있는지 확인
- 전역 Guard 체인에 추가: `Throttler → Jwt → Roles → Permissions → EmailVerified`

### 설계 원칙 (Role vs Permission)
- **Role**은 "어떤 부류의 사용자인가"(ADMIN/MODERATOR/USER 등)를 구분하고, **Permission**은 "그 역할이 실제로 무엇을 할 수 있는가"를 세분화합니다.
- `RolesGuard`는 그대로 유지했고(`@Roles('ADMIN','SUPER_ADMIN')`), `PermissionsGuard`는 별도 축으로 추가했습니다. 두 데코레이터를 함께 붙이면 "역할 필터 → 권한 필터" 순으로 이중 검사됩니다.
- **적용 예시**: `AdminCategoriesController`, `AdminBoardsController`에 `@RequirePermission(PermissionCode.BOARD_MANAGE)`를 실제로 적용했습니다. 현재는 ADMIN/SUPER_ADMIN 모두 이 권한을 가지고 있어 결과상 `@Roles`만 있을 때와 동일하지만, 이제 **"게시판 관리 권한만 가진 별도 역할"을 새로 만들거나, ADMIN에서 이 권한만 회수**하고 싶을 때 `role_permissions` 테이블만 바꾸면 되고 컨트롤러 코드는 손댈 필요가 없습니다.
- 향후 8단계(Report)의 신고 처리, 11단계(Advertisement)의 광고 관리 등에서 각각 `REPORT_RESOLVE`, `AD_MANAGE` 권한 코드로 동일한 패턴을 재사용할 수 있습니다.

### 성능 참고사항
매 요청마다 `role_permissions` 조인 쿼리 1회가 발생합니다. Role-Permission 매핑은 자주 바뀌지 않는 데이터이므로, 트래픽이 늘어나면 (역할명 → 권한 코드 Set)을 Redis에 짧은 TTL로 캐싱하는 최적화를 12단계(Performance)에서 고려할 수 있습니다. 지금은 정확성을 우선해 캐시 없이 구현했습니다.

---

## 2. Category/Board — Soft Delete 미적용, isActive + sortOrder 유지 (변경 없음)

이번 단계에서는 별도 코드 변경 없이 기존 방식을 그대로 확인했습니다.
- `isActive`: 노출/숨김 토글
- `sortOrder`: 노출 순서(displayOrder 역할) — DTO 주석에 이 역할을 명시적으로 문서화했습니다 (`값이 작을수록 먼저 표시됨`)

## 3. 게시판 카테고리 이동 — 게시글 유지 (기존 구현 그대로, 문서화 보강)

`PATCH /admin/boards/:id`에서 `categoryId`를 변경하면 게시판을 다른 카테고리로 이동시킵니다. `BoardsService.update()`에 다음을 명시적으로 주석 처리했습니다:

> `Board.id`와 게시글의 `Post.boardId`는 전혀 변경되지 않으므로, 이동 후에도 해당 게시판에 속한 모든 게시글은 그대로 유지된다 (게시판의 소속 카테고리 정보만 바뀜).

별도 마이그레이션이나 게시글 갱신 로직이 필요 없는 이유는, 게시판 이동이 `Board` 레코드 하나의 `categoryId` 필드만 갱신하는 연산이고, 게시글은 `boardId`로만 게시판을 참조하기 때문입니다.

---

## 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 4건 (모두 Prisma 엔진 미생성, 코드 결함 아님)
파일 수(.ts)      → 81개
```

---

이 상태로 확인해 주시면 **4단계: Posts(게시글 CRUD, 태그, 이미지, 첨부파일, Markdown, 조회수, 검색)**로 진행하겠습니다.
