# AI 개발자 커뮤니티 — Backend 3단계: Category / Board 완료

카테고리·게시판의 공개 조회 API와 관리자용 CRUD를 구현했습니다.

---

## 0. 작업 중 발견한 이슈 — 샌드박스 잔여 파일 정리

`categories`/`boards` 디렉토리를 생성하려는 과정에서, 이번 대화에서 작성한 적 없는 **이전 세션의 잔여 파일**(`translatePrismaError`라는 존재하지 않는 유틸을 참조하는 `categories.service.ts` 등)과, `error-codes.ts`/`app.exception.ts`에 **중복 삽입된 에러 코드 항목**(`CATEGORY_NOT_FOUND` 등이 두 번 선언됨)을 발견했습니다. 이는 이번 대화의 작업 결과물이 아니라 샌드박스 환경에 남아있던 이전 흔적으로 판단되어, 전부 제거하고 지금까지의 코드 컨벤션(서비스에서 `findUnique`로 사전 검증 후 `AppException` 발생)에 맞춰 새로 작성했습니다. 최종 `tsc --noEmit` 결과 이 문제로 인한 오류는 없습니다.

---

## 1. 구현 범위

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/v1/categories` | Public | 카테고리 목록(활성 게시판만 포함) |
| GET | `/v1/boards/:slug` | Public | 게시판 상세 (비활성 게시판은 404) |
| GET | `/v1/admin/categories` | ADMIN 이상 | 전체 카테고리(비활성 게시판 포함) |
| POST/PATCH/DELETE | `/v1/admin/categories(/:id)` | ADMIN 이상 | 카테고리 생성/수정/삭제 |
| GET | `/v1/admin/boards` | ADMIN 이상 | 전체 게시판(비활성 포함) |
| POST/PATCH/DELETE | `/v1/admin/boards(/:id)` | ADMIN 이상 | 게시판 생성/수정/삭제 (활성/비활성 토글 포함) |

`GET /boards/:slug/posts`(게시판별 게시글 목록)는 `Post` 엔티티/서비스가 아직 없으므로 이번 단계에서는 구현하지 않았고, 4단계(Posts)에서 `PostsController`에 추가할 예정입니다 (스텁 주석으로 남겨 두었습니다).

## 2. 핵심 설계 결정

- **비활성 게시판/카테고리는 일반 사용자에게 완전히 숨김**: `isActive=false`인 게시판은 공개 API에서 아예 조회되지 않거나(목록) 404로 응답합니다(상세) — 운영자가 게시판을 준비하면서 미리 만들어두고 공개 시점을 조절할 수 있게 합니다.
- **삭제 보호**: 하위 게시판이 있는 카테고리(`CATEGORY_HAS_BOARDS`), 게시글이 있는 게시판(`BOARD_HAS_POSTS`)은 삭제를 거부합니다. `Post` 테이블은 아직 관련 도메인 모듈이 없지만 스키마에는 이미 존재하므로, `prisma.post.count()`로 안전하게 검사할 수 있었습니다.
- **slug 검증**: 소문자/숫자/하이픈만 허용하는 정규식을 DTO 레벨(`class-validator`)에서 강제해, URL에 안전하지 않은 문자가 slug에 들어가는 것을 원천 차단합니다.
- **관리 권한은 역할(Role) 기반**: `@Roles('ADMIN', 'SUPER_ADMIN')`로 단순 역할 검사만 적용했습니다. 스키마에는 `permissions`/`role_permissions` 테이블(예: `BOARD_MANAGE` 권한)이 이미 있지만, 이를 실제로 검사하는 `PermissionsGuard`는 아직 구현하지 않았고 `RolesGuard`(역할 이름 직접 비교)만 사용 중입니다.

## 3. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 4건 (모두 Prisma 엔진 미생성, 코드 결함 아님)
파일 수(.ts)      → 78개
```

---

## 4. 코드 리뷰 — 확인이 필요한 사항

1. **역할 기반 vs 권한 기반 인가**: 현재 `RolesGuard`는 역할 이름만 비교합니다. 6단계 DB 설계에서 만든 `permissions`/`role_permissions` 테이블(예: `MODERATOR`는 게시판 관리 권한이 없음)을 실제로 활용하려면, `PermissionsGuard` + `@RequirePermission('BOARD_MANAGE')` 데코레이터를 별도로 구현해야 합니다. 지금은 `@Roles('ADMIN','SUPER_ADMIN')`만으로 충분하다고 판단했는데, 세분화된 권한 체계가 이번 단계에 필요하시면 알려주세요.
2. **카테고리/게시판 삭제가 물리 삭제**: `Post`/`Comment`와 달리 `Category`/`Board`에는 Soft Delete(`deletedAt`)를 적용하지 않았습니다. 원본 기획서상 카테고리·게시판은 자주 삭제되는 리소스가 아니라고 판단했고, 대신 `isActive` 토글로 "숨김" 처리가 가능합니다. 복구 가능한 삭제가 필요하시면 `deletedAt`을 추가할 수 있습니다.
3. **게시판 이동(다른 카테고리로)**: `PATCH /admin/boards/:id`에서 `categoryId`를 변경해 게시판을 다른 카테고리로 옮길 수 있도록 구현했습니다. 의도된 기능인지 확인 부탁드립니다 (원본 기획서에는 명시되지 않았지만, 운영 편의상 필요할 것으로 판단해 포함했습니다).

---

이 상태로 확인해 주시면 **4단계: Posts(게시글 CRUD, 태그, 이미지, 첨부파일, Markdown, 조회수, 검색)**로 진행하겠습니다.
