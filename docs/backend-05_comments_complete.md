# AI 개발자 커뮤니티 — Backend 5단계: Comments 완료

댓글/대댓글(2단계 구조), 수정, Soft Delete, 그리고 4단계에서 예고했던 **관리자 전용 댓글 복구**까지 구현했습니다. Posts 단계에서 만든 패턴(BlockService 필터링, PermissionCheckService, Soft Delete + Admin 복구)을 그대로 재사용했습니다.

---

## 1. 엔드포인트

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/v1/posts/:postId/comments` | OptionalAuth | 최상위 댓글 목록 (페이지네이션) |
| POST | `/v1/posts/:postId/comments` | 이메일 인증 필요 | 댓글/대댓글 작성 |
| GET | `/v1/comments/:id/replies` | OptionalAuth | 특정 최상위 댓글의 대댓글 목록 (지연 로딩) |
| PATCH | `/v1/comments/:id` | 이메일 인증 필요 | 댓글 수정 (본인만) |
| DELETE | `/v1/comments/:id` | 로그인 필요 | Soft Delete (본인이거나 `COMMENT_DELETE_ANY` 권한) |
| GET | `/v1/admin/comments/deleted` | ADMIN 이상 | 삭제된 댓글 목록 |
| POST | `/v1/admin/comments/:id/restore` | ADMIN 이상 | 댓글 복구 |

4단계 API 명세 검토 시 결정했던 대로 **최상위 댓글은 페이지네이션, 대댓글은 별도 요청으로 지연 로딩**하는 구조를 그대로 구현했습니다.

## 2. 핵심 설계

- **2단계 구조 강제**: 대댓글 작성 시 `parentId`가 가리키는 댓글이 이미 대댓글(`parentId`가 null이 아님)이면 `INVALID_PARENT_COMMENT`로 거부합니다. 댓글에 대한 댓글에 대한 댓글(3단계 이상 중첩)은 만들 수 없습니다.
- **Soft Delete + "삭제된 댓글입니다" 표시**: 물리 삭제 대신 `deletedAt`만 기록합니다. 대댓글이 달린 최상위 댓글을 물리 삭제하면 스레드 구조가 깨지기 때문입니다. 삭제된 댓글은 응답 시 `content`가 `"삭제된 댓글입니다."`로 대체되고 `isDeleted: true`가 함께 내려갑니다.
- **`replyCount`는 삭제된 대댓글도 포함**해서 셉니다 — 삭제되어도 스레드 상의 "자리"는 그대로 유지되어야 프론트가 트리 구조를 깨지 않고 그릴 수 있기 때문입니다.
- **`Post.commentCount` 동기화**: 댓글 작성/삭제/복구 시 트랜잭션 내에서 게시글의 `commentCount`를 함께 증감시킵니다.
- **차단 필터링 재사용**: Posts 단계에서 만든 `BlockService`를 최상위 댓글 목록과 대댓글 목록 양쪽에 모두 적용해, 차단한 사용자의 댓글이 보이지 않습니다.
- **삭제 권한 재사용**: `PermissionCheckService`로 "본인 댓글이거나 `COMMENT_DELETE_ANY` 권한(모더레이터/관리자)"을 확인합니다 (Posts의 `POST_DELETE_ANY`와 동일한 패턴).
- **관리자 복구**: `AdminCommentsController`(`@Roles('ADMIN','SUPER_ADMIN')`)로 4단계에서 예고했던 댓글 복구를 완성했습니다. 삭제 목록 조회 시에는 예외적으로 실제 댓글 내용을 그대로 보여줘야 관리자가 복구 여부를 판단할 수 있으므로, 플레이스홀더 치환을 건너뛰는 옵션을 응답 매핑 함수에 두었습니다.

## 3. 결정 사항 — Markdown 미적용

Posts와 달리 **댓글에는 Markdown 렌더링을 적용하지 않았습니다** (평문 텍스트로 저장/응답). 원본 기획서와 이번 지시사항 모두 "Markdown"을 명시적으로 요구한 대상은 게시글뿐이었기 때문입니다. 댓글에도 Markdown/코드블록 지원이 필요하시면 `MarkdownService`(4단계에서 이미 공용으로 분리해 둠)를 그대로 재사용해 추가할 수 있습니다.

---

## 4. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 34건 (모두 Prisma Client 미생성, 코드 결함 아님)
파일 수(.ts)      → 110개
```

Posts 단계와 동일하게, `Prisma.CommentSelect`, `Prisma.CommentGetPayload` 등 Prisma의 고급 타입을 사용하는 부분에서 오류 개수가 늘었지만 전부 동일한 근본 원인(샌드박스의 Prisma 엔진 다운로드 차단)입니다.

---

## 5. 코드 리뷰 — 확인이 필요한 사항

1. **댓글 Markdown 미지원**: 위에서 설명한 대로 의도된 결정입니다. 필요하시면 알려주세요.
2. **추천/비추천은 아직 미적용**: `Comment.likeCount`는 응답에 포함되어 있지만, 실제 추천/비추천 처리는 6단계(Reactions/Bookmarks)에서 구현합니다.
3. **삭제된 게시글에 달린 댓글 복구 시 게시글 상태 미확인**: 댓글을 복구할 때 해당 게시글이 여전히 존재/공개 상태인지는 확인하지 않습니다. 게시글이 함께 삭제된 상태에서 댓글만 복구하는 것이 이상하게 느껴질 수 있어, 필요하면 "게시글이 PUBLISHED 상태일 때만 댓글 복구 허용"하는 제약을 추가할 수 있습니다.

---

이 상태로 확인해 주시면 **6단계: Reactions / Bookmarks(추천, 비추천, 북마크)**로 진행하겠습니다.
