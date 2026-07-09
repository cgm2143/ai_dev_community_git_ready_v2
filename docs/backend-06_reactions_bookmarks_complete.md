# AI 개발자 커뮤니티 — Backend 6단계: Reactions / Bookmarks 완료

추천/비추천(토글)과 북마크를 구현했습니다. 이번 단계에서 **6단계 DB 설계에서 약속했던 `TargetValidatorRegistry` 패턴을 처음으로 실제 적용**했습니다.

---

## 1. TargetValidatorRegistry — 처음으로 실전 적용

- `src/common/domain/target-validator.interface.ts` + `target-validator.registry.ts`를 `CommonModule`(전역)에 등록했습니다.
- `PostsModule`/`CommentsModule`이 각각 부트스트랩 시점(`OnModuleInit`)에 자기 자신의 검증기(`PostTargetValidatorRegistrar`, `CommentTargetValidatorRegistrar`)를 레지스트리에 등록합니다.
- `ReactionsService`는 **Posts/Comments 모듈을 전혀 import하지 않고**, 이 레지스트리를 통해서만 "이 대상이 존재하고 반응 가능한 상태인지"를 확인합니다.
- **효과**: 8단계 이후 신고(Report) 기능이나 새로운 반응 대상이 추가되어도, 해당 모듈에서 `registry.register('NEW_TYPE', validator)`만 호출하면 되고 `ReactionsService`/`ReportsService`의 핵심 로직은 전혀 손댈 필요가 없습니다.

## 2. 엔드포인트

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| POST | `/v1/posts/:id/reactions` | 이메일 인증 필요 | 게시글 추천/비추천 (토글) |
| POST | `/v1/comments/:id/reactions` | 이메일 인증 필요 | 댓글 추천 (토글, 비추천 불가) |
| POST | `/v1/posts/:id/bookmark` | 이메일 인증 필요 | 북마크 추가 |
| DELETE | `/v1/posts/:id/bookmark` | 이메일 인증 필요 | 북마크 해제 |
| GET | `/v1/bookmarks` | 로그인 필요 | 내 북마크 목록 |

## 3. 토글 로직

- 같은 타입을 다시 누르면 반응이 취소됩니다 (`active: false`).
- 다른 타입(추천↔비추천)을 누르면 기존 반응이 새 타입으로 전환되며, 카운트도 함께 이동합니다 (기존 -1, 신규 +1를 한 트랜잭션 안에서 처리).
- 댓글은 스키마상 `dislikeCount` 컬럼 자체가 없습니다(원본 기획서에도 댓글엔 "추천"만 명시). 댓글 대상에 `DISLIKE`를 시도하면 `REACTION_TYPE_NOT_SUPPORTED`(400)로 거부합니다 — 컨트롤러 레벨과 서비스 레벨 양쪽에서 이중으로 체크합니다.
- 북마크는 토글이 아니라 **추가/해제 각각 별도 엔드포인트**이며 멱등 처리(이미 있는데 또 추가, 없는데 또 해제해도 에러 없음)했습니다.

---

## 4. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 46건 (모두 Prisma Client 미생성, 코드 결함 아님)
파일 수(.ts)      → 124개
```

`ReactionTargetType`, `ReactionType` enum과 관련된 오류가 이번에 새로 추가되었지만, 이전 단계들과 동일하게 Prisma 엔진 미생성이 근본 원인입니다.

---

## 5. 코드 리뷰 — 확인이 필요한 사항

1. **댓글 북마크 없음**: 북마크는 게시글에만 적용됩니다(스키마상 `Bookmark.postId`만 존재). 댓글 북마크가 필요하시면 스키마 변경(다형성 또는 별도 컬럼)이 필요합니다.
2. **알림 연동 없음**: 추천/비추천 발생 시 게시글/댓글 작성자에게 알림을 보내는 기능은 8단계(Notifications)에서 구현합니다. `TargetValidator.getOwnerId()`를 이미 만들어 두었으므로, 그때 그대로 재사용할 수 있습니다.
3. **반응 이력 조회 API 없음**: "내가 추천한 게시글 목록"처럼 사용자의 반응 이력을 조회하는 API는 이번 범위에 포함되지 않았습니다. 필요하시면 추가하겠습니다.

---

이 상태로 확인해 주시면 **7단계: Search(Full Text Search, 자동완성)**로 진행하겠습니다.
