# AI 개발자 커뮤니티 — Backend 4단계: Posts 완료

게시글 CRUD, 태그, 이미지/첨부파일, Markdown 렌더링, 조회수 배치 반영, 기본 키워드 검색(FTS)까지 구현했습니다. 이 과정에서 재사용 가능한 공용 인프라 3가지(Markdown, Attachments, OptionalAuth)를 함께 만들었습니다.

---

## 1. 신규 공용 인프라

### Markdown (`src/infra/markdown`)
- `markdown-it`으로 렌더링 후 `sanitize-html`로 허용 태그만 남기는 화이트리스트 방식 정화(sanitize)를 적용했습니다. `markdown-it` 자체도 `html: false`로 원시 HTML을 1차 차단합니다.
- 외부 링크에는 `rel="noopener noreferrer"`를 강제해 tabnabbing을 방지했습니다.
- Comments(5단계)에서도 그대로 재사용합니다.

### Attachments (`src/modules/attachments`)
- 프로필 이미지(2단계)와 달리 서버 가공이 필요 없으므로 **Presigned URL 직접 업로드 방식**을 그대로 사용합니다.
- `presigned-url 발급 → confirm(메타데이터 등록) → 게시글 생성/수정 시 attachmentIds로 연결` 흐름이며, 연결 시점에 **업로더 본인 확인 + 이미 다른 게시글에 연결되지 않았는지 확인**해 첨부파일 도용/재사용을 막습니다.

### OptionalAuth (`@OptionalAuth()` + `JwtAuthGuard` 확장)
- 기존에는 `@Public()`(완전 익명, 토큰이 있어도 무시)과 `인증 필수` 두 가지뿐이었습니다.
- 게시글 목록/상세처럼 **비로그인도 볼 수 있어야 하지만, 로그인 사용자에게는 개인화(차단 필터링)를 적용해야 하는** 엔드포인트를 위해 `@OptionalAuth()`를 신설했습니다. 토큰 검증은 시도하되 실패해도 막지 않고 `request.user`를 `undefined`로 둔 채 통과시킵니다.
- 이 메커니즘 덕분에 2단계에서 설계해 둔 `BlockService`가 이번 단계에서 처음 실제로 쓰였습니다: **로그인 사용자가 차단한 사용자의 게시글은 목록/상세 모두에서 보이지 않습니다** (상세는 직접 URL 접근 시에도 404로 응답해 존재 자체를 숨김).

### PermissionCheckService 공유
- 3단계에서 만든 `PermissionsGuard`의 `role_permissions` 조회 로직을 `PermissionCheckService`로 추출해, 라우트 단위 가드뿐 아니라 **서비스 레이어의 조건부 인가**(예: "본인 글이거나 `POST_DELETE_ANY` 권한이 있어야 삭제 가능")에도 재사용했습니다.

---

## 2. 게시글 기능

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/v1/posts` | OptionalAuth | 목록 (boardId/tag/keyword 필터, latest/popular 정렬, 페이지네이션) |
| GET | `/v1/posts/:id` | OptionalAuth | 상세 (조회수 Redis 배치 반영) |
| POST | `/v1/posts` | 이메일 인증 필요 | 작성 (Markdown, 태그, 첨부파일 연결) |
| PATCH | `/v1/posts/:id` | 이메일 인증 필요 | 수정 (본인 글만) |
| DELETE | `/v1/posts/:id` | 로그인 필요 | Soft Delete (본인 글이거나 `POST_DELETE_ANY` 권한) |
| GET | `/v1/boards/:slug/posts` | OptionalAuth | 게시판별 목록 (3단계에서 예고했던 연동 완료) |

### 태그
- `TagsService.syncPostTags()`가 기존 태그와 새 태그 목록을 비교(diff)해, 빠진 태그는 연결 해제 + `usageCount` 감소, 새 태그는 upsert + `usageCount` 증가를 트랜잭션 내에서 처리합니다.
- 태그명은 소문자·트림 정규화 후 게시글당 최대 5개로 제한합니다.

### 조회수 (`PostViewService`)
- 매 조회마다 DB에 쓰지 않고 Redis 카운터(`GETSET`으로 원자적 리셋)에 집계한 뒤, **1분마다 크론(`@nestjs/schedule`)으로 배치 반영**합니다 (1단계 아키텍처 방침 그대로 구현).
- 게시글 작성/수정 직후 응답을 만들 때는 **조회수를 증가시키지 않는 별도 내부 메서드**를 사용하도록 구현 중 발견해 수정했습니다 (아래 "발견한 버그" 참고).

### 검색 (기본 FTS)
- `PostsSearchRepository`가 6단계에서 설계한 `search_vector`(생성 컬럼) + `plainto_tsquery` + `ts_rank`를 `$queryRaw`로 조회합니다. Prisma 스키마가 이 컬럼을 모르므로 반드시 raw 쿼리로만 접근합니다.
- 7단계(Search)에서 이 클래스를 정식 `SearchRepository` 인터페이스의 Postgres 구현체로 승격시키고, 자동완성/다중 엔티티 검색을 추가할 예정입니다. 지금은 Posts 자체 키워드 검색에만 사용합니다.

### Soft Delete
- `status=DELETED` + `deletedAt` 기록만 하고 물리 삭제하지 않습니다 (6단계 정책).

---

## 3. 작업 중 발견해 수정한 버그

**게시글 작성/수정 직후 조회수가 1씩 증가하는 문제**를 발견했습니다. 처음에는 `create()`/`update()`가 응답 조립을 위해 공개 조회용 `findOne()`을 재사용했는데, `findOne()` 내부에 조회수 기록(`postViewService.recordView`)이 포함되어 있어 작성/수정 자체가 "조회 1회"로 잘못 집계되고 있었습니다. 조회수를 증가시키지 않는 내부 전용 메서드(`fetchDetailWithoutRecordingView`)로 분리해 해결했습니다.

---

## 4. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 18건
파일 수(.ts)      → 101개
```

18건 전부 **Prisma Client 미생성(샌드박스 네트워크 제약)** 으로 인한 것입니다. 이번 단계는 `Prisma.PostGetPayload`, `Prisma.PostWhereInput` 등 Prisma의 고급 타입 기능을 많이 사용해서, 이전 단계보다 이 카테고리의 오류 개수 자체는 늘었지만(18건), 전부 동일한 근본 원인(엔진 바이너리 다운로드 차단)이며 코드 결함은 아닙니다. 실제 개발 환경에서 `prisma generate` 실행 시 전부 해소됩니다.

---

## 5. 코드 리뷰 — 확인이 필요한 사항

1. **'popular' 정렬은 임시 구현**입니다 (추천수 내림차순만 반영). 시간 가중치를 반영한 진짜 인기글 랭킹(Redis ZSET 기반)은 12단계(Performance)에서 구현 예정이며, `GET /posts/best`(오늘/주간/월간 베스트) 엔드포인트도 그때 함께 추가하겠습니다.
2. **목록 조회 시 DB에서 본문 전체(`content`/`contentHtml`)를 가져온 뒤 미리보기만 잘라 응답**합니다. 응답 페이로드 자체는 작지만, DB 조회 대역폭은 다소 낭비됩니다. 게시글이 매우 길어지는 경우가 흔하면 `select`로 필요한 컬럼만 가져오는 최적화를 고려할 수 있습니다 (12단계 후보).
3. **첨부파일 최대 크기를 20MB로 임의 설정**했습니다. 명시적으로 지정된 값이 없어 보수적으로 정했는데, 원하시는 값이 있으면 조정하겠습니다.
4. **기존 첨부파일 해제(unlink) 기능 없음**: 게시글 수정 시 `attachmentIds`로 새 첨부파일을 추가할 수는 있지만, 이미 연결된 첨부파일을 목록에서 빼는 기능은 아직 없습니다. 필요하시면 추가하겠습니다.
5. **공지글 설정(`isNotice`) 미노출**: 작성/수정 DTO에 포함하지 않았습니다. 원본 기획서상 공지 작성은 관리자 기능이므로, 10단계(Admin)에서 별도 엔드포인트로 추가할 계획입니다.
6. **게시글 복구(Soft Delete 되돌리기) 없음**: 삭제는 구현했지만 복구는 아직 없습니다. 관리자 기능으로 10단계에서 다룰지 확인 부탁드립니다.

---

이 상태로 확인해 주시면 **5단계: Comments(댓글, 대댓글, 수정, 삭제)**로 진행하겠습니다.
