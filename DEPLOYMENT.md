# 배포 가이드 — Railway(백엔드) + Vercel(프론트엔드)

이 문서는 `apps/api`를 Railway에, `apps/web`을 Vercel에 배포해 실제로 접속 가능한 테스트 서버를
띄우는 절차를 설명합니다. 두 서비스는 서로 다른 도메인에 배포되므로(크로스 도메인),
이를 지원하기 위한 코드 수정(Refresh Token 쿠키의 sameSite 정책, REDIS_URL 지원 등)을
이미 반영해 두었습니다.

---

## 1. Railway — 백엔드(apps/api) 배포

### 1-1. 프로젝트 생성 및 리소스 추가
1. railway.app에서 새 프로젝트를 생성합니다.
2. "Deploy from GitHub repo"로 이 저장소를 연결하되, 서비스의 **Root Directory를 apps/api로 지정**합니다(모노레포이므로 필수).
3. 같은 프로젝트에 플러그인을 추가합니다: PostgreSQL, Redis.
   - Railway가 자동으로 DATABASE_URL을 주입합니다.
   - Redis 플러그인은 REDIS_URL 하나만 제공하는데, 백엔드 설정이 이 형식도 지원하도록 미리 보강해 두었으므로 별도 파싱 없이 그대로 사용할 수 있습니다.

### 1-2. 환경변수 설정 (Railway 서비스 → Variables)
```
NODE_ENV=production
PORT=3000
API_PREFIX=v1

# Postgres/Redis 플러그인이 DATABASE_URL / REDIS_URL을 자동 주입 (직접 설정할 필요 없음)

JWT_ACCESS_SECRET=<openssl rand -base64 48 로 생성>
JWT_REFRESH_SECRET=<위와 다른 값으로 별도 생성>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=14d

# 아래 두 값은 2단계에서 Vercel URL이 정해지면 채웁니다
CORS_ORIGIN=https://<vercel-project>.vercel.app
FRONTEND_URL=https://<vercel-project>.vercel.app

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASSWORD=<smtp 비밀번호>
MAIL_FROM=devhub <no-reply@devhub.example.com>
MAIL_SECURE=false

# 실제 배포에서는 MinIO 대신 AWS S3/Cloudflare R2 등을 권장합니다
S3_ENDPOINT=https://s3.ap-northeast-2.amazonaws.com
S3_REGION=ap-northeast-2
S3_BUCKET=<버킷명>
S3_ACCESS_KEY_ID=<발급받은 키>
S3_SECRET_ACCESS_KEY=<발급받은 시크릿>
S3_PUBLIC_URL_BASE=https://<버킷 공개 URL>
S3_FORCE_PATH_STYLE=false

NOTIFICATION_BROADCAST_BATCH_SIZE=500
SWAGGER_ENABLED=true
SWAGGER_PATH=docs

SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=<배포 전 반드시 변경>
```

### 1-3. 빌드/배포
- apps/api/railway.json이 Dockerfile 기반 빌드로 설정되어 있어, Railway가 자동으로 Dockerfile을 감지해 빌드합니다.
- 컨테이너 시작 시 docker-entrypoint.sh가 **`prisma migrate deploy`** 로 버전관리된 마이그레이션을 적용한 뒤 서버를 기동합니다. (과거의 `prisma db push --accept-data-loss`는 제거되었습니다 — 데이터 손실 위험 제거.)
- 마이그레이션 구성:
  - `20260101000000_init` — uuid_generate_v7() 함수 + 전체 스키마 베이스라인
  - `20260101000100_fts_search_vector` — 전문검색용 `posts.search_vector`(생성 컬럼) + GIN 인덱스(멱등)
- 최초 배포 후 1회, 시드 데이터를 넣어야 합니다: Railway CLI로 `railway run npm run prisma:seed`를 실행하세요.
- 배포 완료 후 Railway가 발급하는 공개 URL(예: https://api-production-xxxx.up.railway.app)을 기록해 둡니다.
- 헬스체크: https://<railway-url>/v1/health

#### ⚠️ 기존 운영 DB baseline (db push로 만들어진 DB에서 마이그레이션으로 전환 시 최초 1회 필수)
과거 `db push`로 스키마를 만든 DB에는 마이그레이션 이력(`_prisma_migrations`)이 없습니다. 이 상태에서 `migrate deploy`를 그대로 실행하면 `init`이 이미 존재하는 테이블을 다시 만들려다 실패합니다. **아래를 배포 전(또는 첫 배포 시) 한 번만** 실행해 `init`을 "적용됨"으로 표시하세요. 그러면 `migrate deploy`는 `init`을 건너뛰고 FTS 마이그레이션만 적용합니다.

```bash
# 기존 운영 DB에 대해 최초 1회만 (스키마는 재실행하지 않고 적용됨 처리)
railway run npx prisma migrate resolve --applied 20260101000000_init

# 이후 정상 배포 (또는 위 명령 직후 자동 재배포) 시 entrypoint가 실행:
#   prisma migrate deploy  →  20260101000100_fts_search_vector 만 적용되어 search_vector/GIN 생성
```

- **완전히 새로운 DB(신규 환경)** 는 이 baseline이 필요 없습니다. `migrate deploy`가 빈 DB에 `init` + `fts`를 순서대로 적용합니다.
- FTS 마이그레이션은 `ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`로 멱등하게 작성되어, `search_vector`가 이미 있든 없든 안전합니다.
- baseline 적용 여부/상태 확인: `railway run npx prisma migrate status`

#### 롤백(Rollback)
- **코드 롤백**: 이 변경 이전 이미지로 재배포하면 entrypoint가 다시 `db push` 방식으로 돌아갑니다. 단, 이미 생성된 `_prisma_migrations` 테이블/`search_vector` 컬럼은 그대로 남으며 무해합니다(db push가 삭제하지 않음).
- **FTS만 되돌리기**(데이터 무손실): `railway run npx prisma migrate resolve --rolled-back 20260101000100_fts_search_vector` 후, 필요 시 수동으로 `DROP INDEX IF EXISTS posts_search_vector_idx; ALTER TABLE posts DROP COLUMN IF EXISTS search_vector;`
- `init` 마이그레이션은 스키마 전체 베이스라인이므로 롤백 대상이 아닙니다(테이블을 지우게 됨). 스키마 변경 롤백은 별도의 역방향 마이그레이션으로 처리하세요.
- **원칙**: `migrate deploy`는 파괴적 DDL을 자동 실행하지 않으므로, 마이그레이션을 추가하지 않는 한 데이터가 손실되지 않습니다.

### 1-4. Worker 서비스(community-worker) 배포 — **필수**

BullMQ Worker(큐 소비자)는 API 프로세스와 **분리된 별도 프로세스**로 동작합니다. API 서비스는 작업을 큐에 넣기만 하고(enqueue), 실제 처리는 Worker 서비스가 합니다. 따라서 **Worker 서비스를 배포하지 않으면 아래 작업이 영구히 처리되지 않습니다:**
- 비밀번호 재설정 등 **메일 발송**
- 공지(NOTICE) **전체 알림 브로드캐스트**
- 인기글 **랭킹 5분 주기 재계산**
- **AI 요약 생성**

> WebSocket 실시간 알림 게이트웨이는 API 프로세스에 그대로 남아 있어 별도 서비스가 필요 없습니다. 분리된 것은 **BullMQ Worker뿐**입니다.

**서비스 생성 방법 (같은 저장소/이미지 재사용):**
1. Railway 프로젝트에서 **"New" → "Deploy from GitHub repo"** 로 **같은 저장소**를 다시 추가합니다(= 두 번째 서비스). Root Directory도 동일하게 **apps/api**.
2. 이 서비스 이름을 `community-worker` 로 지정합니다.
3. **Variables**: api 서비스와 **동일한 DATABASE_URL / REDIS_URL 및 나머지 env(JWT/MAIL/S3/AI 등)** 를 설정하고, 여기에 **`APP_ROLE=worker`** 한 줄을 추가합니다. DB/Redis는 반드시 **api와 같은 인스턴스**를 가리켜야 합니다(같은 Postgres/Redis 플러그인 참조).
4. **Health Check**: Worker는 HTTP 포트를 열지 않으므로 이 서비스의 **Health Check Path를 비웁니다**(Settings → Deploy → Health Check Path 삭제). `railway.json`의 `/v1/health`는 **api 서비스에만** 유효합니다. Worker 생존은 로그의 `[Worker] health OK`(60초 주기)로 확인합니다.
5. entrypoint가 `APP_ROLE=worker`를 감지해 **마이그레이션을 건너뛰고** `node dist/worker.main.js`를 실행합니다(마이그레이션은 api 서비스만 수행).

**환경변수 요약:**

| 변수 | api 서비스 | worker 서비스 |
|---|---|---|
| `APP_ROLE` | (미설정 = api) | **worker** |
| `DATABASE_URL` / `REDIS_URL` | 설정 | **api와 동일(같은 인스턴스 공유)** |
| `JWT_*` / `MAIL_*` / `S3_*` / `ANTHROPIC_API_KEY` 등 | 설정 | **api와 동일하게 설정**(워커도 메일·AI를 호출) |
| Health Check Path | `/v1/health` | **없음(비움)** |

**배포 순서(권장):**
1. **api 서비스 먼저 배포** → 마이그레이션 자동 적용 → `/v1/health` 200 확인.
2. **worker 서비스 배포**(`APP_ROLE=worker`) → 로그에서 `[Worker] 프로세스를 시작합니다.` → `ready` → `[Worker] health OK` 확인.
3. 큐 동작 검증(아래 체크리스트).
- **순서 근거**: 스키마/마이그레이션은 api가 소유하므로 api를 먼저 안정화한 뒤 worker를 올립니다. worker는 스키마를 만들지 않고 읽기/쓰기만 하므로, api가 준비된 후 기동해야 안전합니다.

---

## 2. Vercel — 프론트엔드(apps/web) 배포

1. vercel.com에서 "Add New Project" → 같은 GitHub 저장소를 선택합니다.
2. **Root Directory를 apps/web으로 지정**합니다(모노레포이므로 필수).
3. Framework Preset은 자동으로 "Next.js"가 감지됩니다.
4. 환경변수:
   ```
   NEXT_PUBLIC_API_URL=https://<1단계에서 기록한 Railway URL>
   ```
5. Deploy를 누르면 몇 분 안에 https://<프로젝트명>.vercel.app 주소가 발급됩니다.

---

## 3. 연결하기 (크로스 도메인 마무리)

두 서비스의 도메인이 확정되면 서로를 가리키도록 업데이트합니다:

1. Railway(apps/api) 환경변수의 CORS_ORIGIN / FRONTEND_URL을 Vercel URL로 설정합니다. 저장하면 자동 재배포됩니다.
2. Vercel(apps/web)의 NEXT_PUBLIC_API_URL이 Railway URL을 정확히 가리키는지 확인합니다.
3. 이 두 값이 정확히 일치해야 하는 이유: CORS_ORIGIN이 실제 프론트엔드 도메인과 다르면 브라우저가 API 응답을 차단합니다. 또한 백엔드가 Refresh Token을 httpOnly 쿠키로 내려줄 때 sameSite=none; secure로 설정되어 있어(크로스 도메인 배포를 위해 반영), HTTPS와 정확한 CORS 설정이 갖춰져야 로그인 세션이 정상 동작합니다.

---

## 4. 배포 후 확인 체크리스트

- [ ] https://<railway-url>/v1/health → 200 OK
- [ ] https://<railway-url>/docs → Swagger 문서 정상 노출
- [ ] https://<vercel-url> → 홈 피드 로딩(카테고리/게시글 목록)
- [ ] 회원가입 → 로그인 → 새로고침 후에도 로그인 유지(Refresh Token 쿠키 동작 확인)
- [ ] 게시글 작성 → 알림(WebSocket) 정상 수신
- [ ] **worker 서비스 로그에 `[Worker] health OK` 출력**(큐 소비자 정상 기동)
- [ ] **게시글 상세 진입 → 잠시 후 AI 요약 생성**(worker의 ai-summary 큐 처리 확인)
- [ ] /admin → 시드로 생성된 관리자 계정으로 로그인 시 접근 가능

---

## 5. 알려진 제약

- 이 배포 구성은 MinIO 대신 실제 S3 호환 스토리지(AWS S3, Cloudflare R2 등)를 전제로 합니다. Railway는 지속적인 파일 스토리지에 적합하지 않아 MinIO를 그대로 올리는 것은 권장하지 않습니다.
- **BullMQ Worker는 API와 분리된 별도 서비스(`APP_ROLE=worker`)로 배포합니다**(위 1-4 참고). 두 서비스가 같은 저장소/이미지를 쓰며 DB·Redis를 공유합니다. WebSocket 실시간 알림 게이트웨이만 API 프로세스에 함께 실행됩니다.
- 무료/저가 플랜에서는 컨테이너가 유휴 상태면 슬립될 수 있어, 첫 요청의 응답이 느릴 수 있습니다.
