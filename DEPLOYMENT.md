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
- 컨테이너 시작 시 docker-entrypoint.sh가 prisma migrate deploy를 먼저 실행한 뒤 서버를 기동합니다.
- 최초 배포 후 1회, 시드 데이터를 넣어야 합니다: Railway CLI로 `railway run npm run prisma:seed`를 실행하세요.
- 배포 완료 후 Railway가 발급하는 공개 URL(예: https://api-production-xxxx.up.railway.app)을 기록해 둡니다.
- 헬스체크: https://<railway-url>/v1/health

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
- [ ] /admin → 시드로 생성된 관리자 계정으로 로그인 시 접근 가능

---

## 5. 알려진 제약

- 이 배포 구성은 MinIO 대신 실제 S3 호환 스토리지(AWS S3, Cloudflare R2 등)를 전제로 합니다. Railway는 지속적인 파일 스토리지에 적합하지 않아 MinIO를 그대로 올리는 것은 권장하지 않습니다.
- BullMQ Worker와 WebSocket Gateway가 API 서버와 같은 프로세스에서 함께 실행됩니다(1단계 아키텍처 결정). 트래픽이 커지면 별도 서비스로 분리하는 것을 고려하세요.
- 무료/저가 플랜에서는 컨테이너가 유휴 상태면 슬립될 수 있어, 첫 요청의 응답이 느릴 수 있습니다.
