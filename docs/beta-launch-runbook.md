# Beta Launch Runbook — 베타 오픈 당일 운영 절차

COBION 베타 오픈 당일에 그대로 따라 할 수 있는 운영 런북입니다. 아키텍처 배경은 [ai-architecture.md](./ai-architecture.md), 배포 상세는 [../DEPLOYMENT.md](../DEPLOYMENT.md)를 참고하세요.

- **구성**: API(Railway `community-api`) + Worker(Railway `community-worker`, `APP_ROLE=worker`) + PostgreSQL + Redis + Frontend(Vercel).
- **원칙**: 마이그레이션·스키마는 **api 서비스만** 소유. Worker는 큐 소비만. 두 서비스는 **같은 DB/Redis 인스턴스**를 공유.
- 명령의 `railway run ...`은 Railway CLI가 로그인·링크된 로컬에서 실행합니다(`npm i -g @railway/cli && railway login && railway link`).

---

## 1. 배포 전 체크리스트

오픈 D-1 ~ D-day 아침에 순서대로 확인합니다. 하나라도 ❌면 오픈을 보류합니다.

### 1-1. DB Backup (가장 먼저)
- [ ] **오픈 직전 스냅샷 확보**: Railway Postgres 자동 백업/PITR 활성화 여부 확인, 또는 수동:
  ```bash
  railway run pg_dump "$DATABASE_URL" > backup_prelaunch_$(date +%F).sql
  ```
- [ ] 백업 파일 크기가 0이 아니고, 오프사이트(로컬/클라우드 스토리지)에 1부 보관.
- [ ] 복구 리허설(선택, 권장): 임시 DB에 `psql < backup...sql` 로 복원되는지 1회 확인.

### 1-2. Migration Status
- [ ] 마이그레이션 상태 확인:
  ```bash
  railway run npx prisma migrate status
  ```
- [ ] **기존 운영 DB(db push 이력)** 라면 최초 1회 baseline이 되어 있어야 함:
  ```bash
  # _prisma_migrations 없음 → 아래 1회 실행 후 재확인
  railway run npx prisma migrate resolve --applied 20260101000000_init
  ```
- [ ] 최종 상태: `20260101000000_init` = applied, `20260101000100_fts_search_vector` = applied(또는 배포 시 적용 예정).
- [ ] FTS 컬럼 존재 확인(검색 필수): `railway run psql "$DATABASE_URL" -c "\d posts"` 출력에 `search_vector` + `posts_search_vector_idx` 있는지.

### 1-3. Railway (서비스 2개)
- [ ] `community-api` 서비스: Root=apps/api, Health Check Path=`/v1/health`.
- [ ] `community-worker` 서비스: Root=apps/api, **`APP_ROLE=worker`**, **Health Check Path 비움**.
- [ ] 두 서비스가 **동일한 Postgres/Redis 플러그인**을 참조.
- [ ] `restartPolicyType: ON_FAILURE` 확인.

### 1-4. Worker
- [ ] worker 서비스 최신 이미지로 배포 준비(api와 같은 커밋).
- [ ] worker에 **AI/메일 env 포함**(`ANTHROPIC_API_KEY`, `MAIL_*`) — 요약·메일이 worker에서 실행됨.

### 1-5. Redis
- [ ] Redis 플러그인 살아있고 연결 가능: `railway run redis-cli -u "$REDIS_URL" PING` → `PONG`.
- [ ] BullMQ/랭킹/조회수/연관글 캐시/Rate Limit이 모두 이 Redis를 씀 → **단일 인스턴스 공유** 재확인.

### 1-6. Environment Variables (api·worker 공통 확인)
- [ ] **필수(부팅 검증 대상)**: `DATABASE_URL`, `REDIS_URL`(또는 REDIS_HOST/PORT), `JWT_ACCESS_SECRET`(≥32), `JWT_REFRESH_SECRET`(≥32, access와 다른 값).
- [ ] **도메인 연결**: `CORS_ORIGIN`/`FRONTEND_URL`(= Vercel 도메인), Vercel의 `NEXT_PUBLIC_API_URL`(= Railway api 도메인), `NEXT_PUBLIC_SITE_URL`(canonical/sitemap용, 미설정 시 프리뷰 도메인 폴백 주의).
- [ ] **메일/스토리지**: `MAIL_*`, `S3_*`(실 S3/R2 권장).
- [ ] **AI**: `ANTHROPIC_API_KEY`(없으면 Stub로 자동 폴백=AI 비활성), `AI_MODEL`, `AI_TEMPERATURE`, `AI_MAX_TOKENS`, `AI_TIMEOUT_MS`, `AI_MAX_RETRIES`, `SUMMARY_PROMPT_VERSION`, `TAG_PROMPT_VERSION`, (선택) `AI_DAILY_COST_LIMIT`/`AI_MONTHLY_COST_LIMIT`/`AI_REQUEST_LIMIT_PER_HOUR`.
- [ ] **기타**: `RELATED_POSTS_CACHE_TTL`, `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`(오픈 전 변경), `SWAGGER_ENABLED`(운영 권장 `false`).
- [ ] 시크릿이 로그/코드에 노출되지 않는지(로깅은 authorization/cookie를 redact함).

---

## 2. 배포 순서

> 반드시 **API → Migration → Worker → Health Check → Smoke Test** 순서. Migration은 api 컨테이너 entrypoint가 자동 수행합니다.

1. **API 배포** (`community-api`)
   - 최신 커밋 배포 트리거. entrypoint가 `prisma migrate deploy` 실행 후 서버 기동.
2. **Migration 적용 확인** (API 배포에 포함)
   - api 로그에 `[entrypoint] Prisma 마이그레이션 적용 중 (migrate deploy)...` → 성공 후 `API 서버를 시작합니다.`
   - 실패(예: baseline 미처리)면 즉시 1-2로 돌아가 baseline 후 재배포. **Worker 배포 전에 반드시 해결.**
3. **Worker 배포** (`community-worker`, `APP_ROLE=worker`)
   - worker 로그에 `[Worker] 프로세스를 시작합니다.` → 각 큐 `ready` → 60초 후 `[Worker] health OK`.
4. **Health Check**
   - `curl https://<api-domain>/v1/health` → `{"status":"ok", ...}` (DB/Redis up). `degraded`면 503 → 5. 아니면 중단.
   - Vercel 프론트 URL 접속 → 홈 로딩.
5. **Smoke Test** (3장 수행)

---

## 3. Smoke Test

오픈 직후 실제 계정으로 아래를 순서대로 1회씩 검증합니다. 괄호는 확인 포인트.

- [ ] **회원가입**: 신규 이메일로 가입 → 즉시 로그인 상태(이메일 인증 없이 auto-verify).
- [ ] **로그인**: 로그아웃 후 재로그인 → 새로고침해도 세션 유지(Refresh Token 쿠키 동작; 크로스도메인 CORS/HTTPS 정상).
- [ ] **글쓰기**: 게시판 선택 → 제목/본문(Markdown) → 등록 → 상세로 이동, 본문 정상 렌더(서버 sanitize).
- [ ] **댓글**: 방금 글에 댓글/대댓글 작성 → 즉시 노출, 댓글 수 증가.
- [ ] **검색**: 방금 글 제목 키워드로 검색 → 결과에 노출(=`search_vector`/GIN 정상, FTS 마이그레이션 적용 확인).
- [ ] **AI Summary**: 글 상세 상단 "AI 요약" 카드 → "생성 중" → 잠시 후 3~5줄 요약(=worker의 ai-summary 큐 + `ANTHROPIC_API_KEY` 정상). *키 없으면 카드 숨김(정상)*.
- [ ] **Related Posts**: 태그/카테고리 겹치는 글이 있을 때 상세 하단 "연관 게시글" 노출(=Redis 캐시/스코어링 정상).
- [ ] **AI 태그 추천**: 글쓰기 화면 "AI 태그 추천" → 칩 표시 → 클릭 시 태그 입력 반영(자동 저장 없음).
- [ ] **알림**: 다른 계정으로 내 글에 댓글 → 원계정에서 실시간 알림 수신(WebSocket, API 프로세스).
- [ ] **Worker Queue**: `curl https://<api-domain>/v1/admin/ai/metrics`(관리자 토큰) → `queue.waiting/active`, `deadLetterCount` 확인. DLQ 급증 없음.
- [ ] **관리자**: `/admin` → 시드 관리자 로그인 → 대시보드 접근.

하나라도 실패 시 4장(장애 대응)으로.

---

## 4. 장애 대응

각 장애: **증상 → 확인 방법 → 복구 방법 → 롤백 방법**. 공통 롤백: Railway에서 직전 성공 배포로 **Rollback(Redeploy previous)**.

### 4-1. Worker 장애 (큐 미소비)
- **증상**: AI 요약이 계속 "생성 중"에서 안 끝남 / 비밀번호 재설정 메일 안 옴 / 공지 알림 미발송 / 랭킹(HOT) 갱신 정지. API·화면은 정상.
- **확인**:
  - worker 로그에 `[Worker] health OK`가 60초마다 찍히는지(없으면 다운/행).
  - `GET /v1/admin/ai/metrics` → `queue.waiting`이 계속 쌓이고 `active`가 0.
  - `redis-cli -u "$REDIS_URL" LLEN bull:ai-summary:wait` 등으로 대기 적체 확인.
- **복구**:
  - worker 서비스 **Restart/Redeploy**. 기동 후 대기 작업 자동 소비(`jobId` 고정이라 요약 중복 없음).
  - worker env(`REDIS_URL`이 api와 동일한지, `ANTHROPIC_API_KEY`/`MAIL_*` 존재) 재확인.
  - 최종 실패한 작업은 DLQ로 이동 → `GET /v1/admin/ai/dead-letters` 확인 후 `POST /v1/admin/ai/dead-letters/:id/requeue`로 재실행.
- **롤백**: worker를 직전 정상 이미지로 Redeploy. (api는 영향 없음 — 작업은 큐에 보존되어 유실 없음.)

### 4-2. Redis 장애
- **증상**: `/v1/health`가 `degraded`(503). 로그인/Rate Limit/조회수/랭킹/연관글 캐시/모든 큐 동작 이상. 요약·알림 큐 정지.
- **확인**:
  - `redis-cli -u "$REDIS_URL" PING` → `PONG` 안 오면 다운.
  - api 로그에 ioredis `ECONNREFUSED`/timeout 다발.
  - `/v1/health` 응답의 redis `status: down`.
- **복구**:
  - Railway Redis 플러그인 상태 확인 → Restart. 연결 복구되면 api/worker가 자동 재연결(별도 조치 불필요, 진행 중이던 일부 요청은 실패 가능).
  - 지속 시 새 Redis 인스턴스 프로비저닝 → api·worker의 `REDIS_URL` 갱신 → 두 서비스 재배포. (BullMQ 대기열은 유실될 수 있음 — 재요청/재큐 필요.)
- **롤백**: Redis는 코드 롤백 대상이 아님. 인스턴스 교체가 곧 복구. 캐시성 데이터라 영구 손실 리스크 낮음(랭킹은 5분 주기 재계산으로 자동 보정).

### 4-3. PostgreSQL 장애
- **증상**: `/v1/health`가 `degraded`(503). 모든 읽기/쓰기(로그인·글·댓글·검색) 실패. api 부팅 실패 가능(P1001).
- **확인**:
  - `railway run psql "$DATABASE_URL" -c "SELECT 1;"` 실패 여부.
  - `/v1/health`의 database `status: down`, api 로그 `P1001`/connection 오류.
- **복구**:
  - Railway Postgres 플러그인 Restart / 상태 확인. 연결 복구 후 api·worker 자동 정상화.
  - 커넥션 고갈이 의심되면 트래픽 급증 여부 확인(단일 상주 프로세스라 희박) 후 재시작.
  - 데이터 손상/치명 장애 시: 1-1 백업에서 복구(`psql < backup...sql` 또는 Railway PITR). 복구 후 `migrate status`로 스키마 정합 확인.
- **롤백**: 스키마 변경이 원인이면 → 문제 마이그레이션만 되돌림(비파괴 원칙; `migrate resolve --rolled-back <name>` + 역방향 SQL). 데이터 손상이면 백업 복원이 유일한 롤백. **`migrate deploy`는 파괴적 DDL을 자동 실행하지 않으므로 새 마이그레이션이 없으면 데이터 손실 없음.**

### 4-4. AI API 장애 (Anthropic)
- **증상**: AI 요약이 생성 안 됨/실패 표시("AI 요약을 생성할 수 없습니다."), 태그 추천 빈 결과. **게시글/댓글/검색 등 일반 기능은 정상**(AI는 격리됨).
- **확인**:
  - `GET /v1/admin/ai/metrics` → `failureRate` 급등, `deadLetterCount` 증가.
  - worker 로그에 `[Worker] job failed`(ai-summary) / Anthropic 오류(401/429/5xx/timeout).
  - `AI_*` env, `ANTHROPIC_API_KEY` 유효성(쿼터/결제) 확인.
- **복구**:
  - 일시 오류(429/5xx): SDK가 `AI_MAX_RETRIES`로 재시도, 큐도 3회 재시도. 대개 자동 회복. DLQ 적체 시 원인 해소 후 `requeue`.
  - 키/쿼터 문제: 키 교체 또는 `AI_MODEL`을 저비용 모델로 변경 후 worker 재배포.
  - 비용 급증: `AI_DAILY_COST_LIMIT` 등 설정(현재 경고 로그) → 필요 시 **AI 일시 비활성화**: `ANTHROPIC_API_KEY` 제거 → Stub 폴백(요약 카드 숨김, 태그 빈 결과). 커뮤니티 기능엔 영향 없음.
- **롤백**: AI만 끄면 되므로 서비스 롤백 불필요. 키 제거/모델 변경으로 즉시 격리. 프롬프트 회귀면 `SUMMARY_PROMPT_VERSION`/`TAG_PROMPT_VERSION`을 이전 값으로(캐시 자동 무효화).

---

## 5. 운영 모니터링

### 매일 (Daily)
- [ ] `/v1/health` 200 확인(외부 uptime 모니터 권장 — UptimeRobot 등).
- [ ] worker 로그 `[Worker] health OK` 지속 여부.
- [ ] `GET /v1/admin/ai/metrics`: `failureRate`, `queue.waiting/active`, `deadLetterCount`, `todayCost`.
- [ ] DLQ에 신규 항목 있는지 → 원인 확인 후 requeue/처리.
- [ ] 에러 로그 급증(500/예외) 스캔.
- [ ] 신규 가입/글/신고 수 이상 급증(스팸/어뷰징) 여부, 관리자 신고 큐 확인.

### 매주 (Weekly)
- [ ] DB 백업이 정상 생성·보관되는지(복구 가능성).
- [ ] `railway run npx prisma migrate status` = 드리프트 없음.
- [ ] AI 주간 비용(`monthCost` 추세) 및 토큰 사용량 검토, 필요 시 모델/한도 조정.
- [ ] Redis 메모리 사용량/키 증가 추세(랭킹 ZSET, 캐시) 점검.
- [ ] 금칙어/신고 처리 백로그, 관리자 활동 로그 검토.
- [ ] 응답 지연(상세 3중 호출로 인한 조회수 인플레 등 알려진 이슈) 모니터.

### 매월 (Monthly)
- [ ] AI 월 비용 정산 및 예산 대비 검토, 한도(`AI_*_COST_LIMIT`) 재설정.
- [ ] DB 용량/인덱스 상태, 느린 쿼리(태그/연관글/검색) 점검 — 데이터 증가에 따른 인덱스 추가 검토.
- [ ] JWT/세션 정책, 시크릿 로테이션 필요성 검토.
- [ ] `AiRequestLog` 로그 보존/정리 정책 검토(테이블 증가).
- [ ] 백업 **복구 리허설**(임시 DB로 실제 복원 1회).
- [ ] 의존성 보안 업데이트(`npm audit`) 및 Prisma/Nest/Next 마이너 업그레이드 검토.

---

## 부록 — 자주 쓰는 명령
```bash
# 헬스체크
curl -s https://<api-domain>/v1/health | jq

# 마이그레이션 상태 / baseline
railway run npx prisma migrate status
railway run npx prisma migrate resolve --applied 20260101000000_init

# Redis / DB 핑
railway run redis-cli -u "$REDIS_URL" PING
railway run psql "$DATABASE_URL" -c "SELECT 1;"

# AI 운영 지표 / DLQ (관리자 토큰 필요)
curl -s -H "Authorization: Bearer <admin-token>" https://<api-domain>/v1/admin/ai/metrics | jq
curl -s -H "Authorization: Bearer <admin-token>" https://<api-domain>/v1/admin/ai/dead-letters | jq

# 백업
railway run pg_dump "$DATABASE_URL" > backup_$(date +%F).sql
```
