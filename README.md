# AI 개발자 커뮤니티 — 백엔드 + 프론트엔드

디시인사이드+Reddit+Discord를 참고한 AI/개발자 커뮤니티 플랫폼입니다.
- 백엔드(`apps/api`): NestJS + Prisma + PostgreSQL + Redis + BullMQ + Socket.IO
- 프론트엔드(`apps/web`): Next.js(App Router) + TypeScript + TailwindCSS + TanStack Query

전체 설계 문서는 `docs/` 폴더의 단계별 산출물(`docs/*.md`)을 참고하세요.

**Railway(백엔드) + Vercel(프론트엔드)로 실제 배포하려면 [`DEPLOYMENT.md`](./DEPLOYMENT.md)를 참고하세요.**

---

## 빠른 시작 (Docker Compose)

```bash
# 1. 환경변수 파일 준비
cp apps/api/.env.example apps/api/.env
# JWT_ACCESS_SECRET / JWT_REFRESH_SECRET는 반드시 서로 다른 32자 이상의 랜덤 값으로 교체하세요.
# openssl rand -base64 48

# 2. 전체 스택 기동 (PostgreSQL, Redis, MinIO, 버킷 자동 생성, API 서버)
docker compose up -d --build

# 3. 최초 1회 - 시드 데이터 적재 (역할/권한/카테고리/게시판 등 기본 데이터)
docker compose exec api npm run prisma:seed
```

- API: http://localhost:3000/v1
- Swagger 문서: http://localhost:3000/docs (SWAGGER_ENABLED=true일 때)
- MinIO 콘솔: http://localhost:9001 (devuser / devpassword123)
- 헬스체크: http://localhost:3000/v1/health

### 서비스 구성

| 서비스 | 설명 |
|---|---|
| postgres | 메인 데이터베이스. 최초 기동 시 infra/postgres/initdb의 초기화 스크립트(uuid_generate_v7 함수 등)가 자동 적용됩니다. |
| redis | 캐시, Pub/Sub(실시간 알림), Rate Limit 카운터, 랭킹(ZSET) 등에 공용으로 사용됩니다. |
| minio | S3 호환 오브젝트 스토리지 (프로필 이미지, 게시글 첨부파일). |
| createbuckets | minio가 준비되면 1회 실행되어 ai-dev-community 버킷을 생성하고 공개 다운로드 정책을 적용한 뒤 종료됩니다. |
| api | NestJS 애플리케이션. 컨테이너 시작 시 docker-entrypoint.sh가 prisma migrate deploy를 먼저 실행한 뒤 서버를 기동합니다. |

### 마이그레이션 관련 참고

개발 과정에서 스키마가 여러 차례 점진적으로 변경되었지만, 실제 `prisma migrate dev`로 생성된 개별 마이그레이션 파일 이력은 이 샌드박스 환경에서 Prisma 엔진(바이너리) 다운로드가 차단되어 생성하지 못했습니다 (`prisma/schema.prisma`는 최종 상태를 정확히 반영하고 있습니다). 실제 개발 환경에서 프로젝트를 받으신 후 아래 순서로 최초 마이그레이션을 생성해 주세요:

```bash
cd apps/api
npm install
npx prisma generate
npx prisma migrate dev --name init
```

이후부터는 docker-entrypoint.sh가 자동으로 실행하는 `prisma migrate deploy`로 배포 시마다 마이그레이션이 적용됩니다.

---

## 로컬 개발 (Docker 없이)

```bash
cd apps/api
npm install
cp .env.example .env   # DATABASE_URL/REDIS_HOST 등을 로컬 환경에 맞게 수정
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

PostgreSQL/Redis/MinIO는 로컬에 직접 설치하거나, `docker compose up postgres redis minio createbuckets`로 인프라만 띄우고 API만 로컬에서 실행할 수도 있습니다.

---

## 시드 데이터

`prisma/seed.ts`가 다음을 생성합니다:
- 역할(Role): USER, MODERATOR, ADMIN, SUPER_ADMIN
- 권한(Permission) 및 역할별 매핑(role_permissions)
- 최초 관리자 계정 (.env의 SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
- 기본 카테고리/게시판 샘플 데이터

---

## 백엔드 구현 단계 (완료)

1. Auth — 회원가입/로그인/JWT/Refresh Rotation/이메일 인증/비밀번호 재설정
2. User — 프로필/차단/프로필 이미지(WebP 파이프라인)
3. Category/Board — CRUD + RBAC(Role+Permission)
4. Posts — CRUD/태그/첨부파일/Markdown/조회수/기본 검색
5. Comments — 댓글/대댓글/Soft Delete + 관리자 복구
6. Reactions/Bookmarks — 토글 반응 + 다형성 대상 검증 레지스트리
7. Search — Full Text Search + 자동완성 + 인기 검색어
8. Notifications — WebSocket 실시간 알림 + BullMQ 배치 발송
9. Report — 신고 + 처리 알림
10. Admin — 회원/공지/금칙어/IP 차단/설정/통계/로그
11. Advertisement — 광고 슬롯/배너
12. Performance — 인기글 랭킹(증분 갱신 + BullMQ 재검증) + Redis 캐싱/Throttler

각 단계의 상세 설계·결정 사항은 `docs/backend-*.md` 문서들에 기록되어 있습니다.

---

## 프론트엔드 (apps/web)

```bash
cd apps/web
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL이 백엔드 주소를 가리키는지 확인
npm run dev
```

- 개발 서버: http://localhost:3001 (백엔드 3000과 겹치지 않도록 `next dev -p 3001` 또는 `PORT=3001 npm run dev` 권장)
- 백엔드가 먼저 떠 있어야 로그인/피드 등 실제 데이터가 표시됩니다.

### 이번 턴에 구현한 범위 (1차)

- 프로젝트 스캐폴딩: Next.js App Router + TypeScript + TailwindCSS, 2단계 폴더 구조 문서 그대로 반영
- 디자인 시스템: 5단계 UI 설계의 라이트/다크 토큰(CSS 변수) + Space Grotesk/Inter/JetBrains Mono 폰트를 Tailwind에 연결
- 공통 UI 프리미티브: Button/Input/Label/Card (shadcn/ui 패턴, Radix 기반)
- API 클라이언트(`lib/api-client.ts`): Access Token은 메모리에만 보관(XSS 대비), 401 시 Refresh Token 쿠키로 자동 재발급 후 재시도
- 인증: 로그인/회원가입 페이지(react-hook-form + Zod, 백엔드 비밀번호 정책과 동일한 검증), 세션 부트스트랩(새로고침 시 자동 재로그인)
- 메인 레이아웃: 헤더(검색창/알림/프로필/다크모드 토글) + 좌측 카테고리 사이드바(실제 `/categories` API 연동) + 우측 사이드바(광고 슬롯은 실제 `/ads/slots/:code` API 연동)
- 홈 피드: 실제 `/posts` API 연동, **PostCard의 Activity Pulse Bar**(5단계 시그니처 요소, 접근성 보완을 위해 색상+숫자 병행)

### 검증

- `npx tsc --noEmit` 전체 통과
- `npm run build` — **Google Fonts(`fonts.googleapis.com`)에 대한 네트워크 접근이 없는 샌드박스 환경 제약으로 폰트 로더만 실패**했고, 폰트 로딩을 임시로 제거한 상태에서는 전체 페이지(`/`, `/login`, `/register`, `/verify-email`)가 정상적으로 빌드/정적 생성되는 것까지 확인했습니다. 실제 개발 환경(인터넷 연결 있음)에서는 `next/font/google`이 정상 동작하므로 별도 조치가 필요 없습니다.

### 이번 턴에 구현한 범위 (2차 — 게시글 상세/작성 + 댓글)

- **게시글 상세** (`/boards/[boardSlug]/[postId]`): 백엔드가 정화(sanitize)한 `contentHtml` 렌더링, 추천/비추천 토글, 북마크 토글, 태그 목록, 첨부파일 링크, 본인 글일 때 수정/삭제 버튼
- **게시글 작성/수정** (`/write`, `/boards/[boardSlug]/[postId]/edit`): 공용 `PostEditor` 컴포넌트 — 게시판 선택(실제 카테고리 API 연동), Markdown 텍스트 영역 + `marked` 기반 실시간 클라이언트 미리보기(어디까지나 미리보기용이며, 실제 저장되는 `contentHtml`은 서버의 `MarkdownService`가 다시 렌더링/정화함), 태그 입력(최대 5개)
- **댓글 트리**: 최상위 댓글 목록(페이지네이션) + 대댓글 지연 로딩(펼치기 클릭 시에만 조회) — 백엔드 5단계 설계와 동일한 패턴. 댓글 작성/답글/추천/삭제, 삭제된 댓글은 "삭제된 댓글입니다" 플레이스홀더로 표시
- 반응(추천/비추천)·북마크 기능의 API 연동 (`features/reactions`, `features/bookmarks`)

### 알려진 단순화 (다음 턴에 보완 예정)

- **북마크 초기 상태 미동기화**: 백엔드 `PostDetailDto`에 "내가 북마크했는지" 필드가 없어, 지금은 페이지를 새로고침하면 항상 미북마크 상태로 시작합니다. 마이페이지(북마크 목록) 기능과 함께 정확히 동기화할 예정입니다.
- **내 반응 상태 미표시**: 마찬가지로 "내가 이미 추천했는지"는 서버 응답에 없어, 새로고침 후에는 버튼 강조가 초기화됩니다.

### 검증 (2차)

- `npx tsc --noEmit` 전체 통과
- `npm run build` — 이번에도 Google Fonts 네트워크 제약(샌드박스 한정)만 제외하면 신규 페이지 4개(게시글 상세/수정/작성 포함 총 8개 라우트)까지 포함해 전체가 정상적으로 빌드/생성되는 것을 확인했습니다.



### 이번 턴에 구현한 범위 (3차 — 게시판 목록/검색/프로필/설정/알림)

- **게시판별 게시글 목록** (`/boards/[boardSlug]`): 최신순/인기순 전환, 페이지네이션
- **검색 결과** (`/search?q=`): 헤더 검색창과 실제 연동(`/search/posts`), 검색어 없을 때 안내 문구
- **공용 컴포넌트 정리**: `PostList`(로딩/에러/빈 상태 공통 처리), `Pagination` — 홈/게시판/검색 페이지가 모두 재사용
- **프로필** (`/profile/[nickname]`): 공개 프로필 조회, 본인 프로필이면 설정 바로가기 노출
- **설정** (`/settings`): 닉네임/소개글 수정, 프로필 이미지 업로드(멀티파트, 백엔드 WebP 파이프라인 연동), 비밀번호 변경, 차단 목록 조회/해제, 회원 탈퇴(비밀번호 확인 2단계 확인)
- **알림** (`/notifications`): 목록 조회(안읽음 개수 포함), 개별/전체 읽음 처리, 삭제, **WebSocket 실시간 수신**(`/ws/notifications`, 백엔드 8단계 NotificationsGateway와 Access Token으로 연결) — 새 알림이 오면 목록을 자동 갱신하고, 헤더의 알림 버튼에 안읽음 배지 표시
- 알림 클릭 시 게시글로 이동하는 경량 리다이렉트 페이지(`/notifications/go/post/[postId]`) — 알림에는 postId만 있어 boardSlug를 몰라도 게시글 상세로 이동 가능하도록 처리

### 검증 (3차)

- `npx tsc --noEmit` 전체 통과
- `npm run build` — Google Fonts 네트워크 제약(샌드박스 한정)만 제외하면 **총 14개 라우트 전체가 정상 빌드**되는 것을 확인했습니다(게시판/검색/프로필/설정/알림 신규 포함).



---

### 이번 턴에 구현한 범위 (4차 — 관리자 대시보드)

- **`/admin` 레이아웃**: `ADMIN`/`SUPER_ADMIN`/`MODERATOR`만 접근 가능(그 외 역할은 홈으로 리다이렉트), 좌측 네비게이션
- **대시보드** (`/admin`): 회원/게시글/댓글/미처리 신고 통계, 신고 사유별·처리 상태별 집계
- **회원 관리** (`/admin/users`): 닉네임/이메일 검색, 역할 변경(드롭다운), 계정 정지/활성화
- **신고 처리** (`/admin/reports`): 상태별 탭(미처리/조치완료/반려), 조치완료·반려 처리
- **광고 관리** (`/admin/ads`): 목록, 신규 등록(슬롯 코드/이미지 URL/링크), 삭제, 노출·클릭·CTR 통계 조회
- **금칙어 관리** (`/admin/words`): 목록/추가/삭제 — 게시글·댓글 작성 시 실시간 검사되는 바로 그 목록
- **IP 차단** (`/admin/ip-bans`): 목록/추가(사유·만료일)/해제
- **사이트 설정** (`/admin/settings`): key-value 조회/수정/추가(JSON 값 지원)
- **관리자 로그** (`/admin/logs`): action 필터, 관리자 행위 이력 조회

### 검증 (4차)

- `npx tsc --noEmit` 전체 통과
- `npm run build` — Google Fonts 네트워크 제약(샌드박스 한정)만 제외하면 **관리자 페이지 8개를 포함해 총 22개 라우트 전체가 정상 빌드**되는 것을 확인했습니다.



---

### 다음에 이어서 만들 화면 (미구현)

- 카테고리/게시판 관리 화면 (`/admin/boards` — 백엔드 API는 3단계에 이미 구현되어 있음)
- 다크모드 서버 컴포넌트 초기 반영(현재는 클라이언트 마운트 후 쿠키를 읽어 적용하므로 최초 렌더 시 라이트→다크 전환이 한 프레임 보일 수 있음)
- 북마크/반응의 초기 상태 서버 동기화 (위 "알려진 단순화" 참고)
- 태그 검색/인기 태그 위젯 (`/search/tags`, `/search/popular` 연동)
- 자동완성 드롭다운 (`/search/autocomplete` 연동 — 현재 검색창은 제출 시에만 이동)

---

## 알려진 제약 (샌드박스 환경 한정)

이 저장소는 코드 생성 샌드박스에서 작성되었으며, 외부 네트워크 제약으로 다음을 실제로 검증하지 못했습니다:
- Prisma 엔진 다운로드 및 실제 마이그레이션 생성/적용
- PostgreSQL과 연결된 실제 API 서버 통합 구동
- Docker 이미지 빌드(특히 Alpine에서의 sharp 네이티브 바이너리 로드)

반면 다음은 샌드박스에서 실제로 실행/검증했습니다:
- `tsc --noEmit` 전체 타입 검사 (Prisma 미생성으로 인한 예상된 오류 외 없음)
- sharp 이미지 리사이즈/변환 로직 (Node.js 직접 실행)
- 랭킹 점수 계산식 (Node.js 직접 실행)
- Redis 기반 Throttler 저장소 통합 테스트 (로컬 Redis 설치 후 다중 인스턴스/TTL/장애 시나리오 실행)

실제 개발 환경에서 `docker compose up`으로 최종 구동 확인을 권장합니다.
