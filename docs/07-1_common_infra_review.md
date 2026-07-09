# AI 개발자 커뮤니티 — 7단계-1: 공통 인프라 구축 (완료)

우선순위 기반 순차 개발 방침에 따라 Backend의 공통 인프라만 먼저 구현했습니다. 실제 NestJS 프로젝트로 작성했고, 로컬에서 `npm install` + `tsc --noEmit`으로 컴파일 검증을 마쳤습니다.

---

## 1. 구현 범위와 위치

| 항목 | 위치 |
|---|---|
| 프로젝트 구조/설정 | `apps/api/package.json`, `tsconfig*.json`, `nest-cli.json` |
| Config (환경변수 검증 + 타입 안전 조회) | `src/config/env.validation.ts`, `src/config/configuration.ts` |
| Logger (구조화 로깅, pino) | `src/infra/logger/logger.module.ts` |
| Global Exception Filter | `src/common/filters/http-exception.filter.ts` |
| 도메인 예외 / 에러 코드 | `src/common/exceptions/app.exception.ts`, `src/common/constants/error-codes.ts` |
| Validation Pipe (전역 등록) | `src/main.ts` |
| 응답 표준화 인터셉터 | `src/common/interceptors/transform.interceptor.ts`, `logging.interceptor.ts` |
| Prisma 설정 | `src/infra/prisma/prisma.service.ts`, `prisma.module.ts`, `prisma/schema.prisma` |
| Redis 설정 | `src/infra/redis/redis.service.ts`, `redis.module.ts` |
| JWT 인증 기반 | `src/modules/auth/auth.module.ts`, `strategies/jwt.strategy.ts`, `src/common/guards/{jwt-auth,roles}.guard.ts` |
| Swagger 설정 | `src/main.ts` (DocumentBuilder), `src/common/dto/api-response.dto.ts` |
| Docker / Docker Compose | `apps/api/Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`(루트) |
| 공통 유틸/데코레이터 | `src/common/decorators/*`, `src/common/utils/id.util.ts` |
| DB 초기화(UUID v7 함수) | `infra/postgres/initdb/01_uuid_v7_function.sql` |
| Prisma 시드 | `prisma/seed.ts` (Role/Permission, 카테고리·게시판, 광고 슬롯, 설정, 관리자 계정) |

---

## 2. 핵심 설계 결정 및 근거

1. **전역 Guard 체인** (`ThrottlerGuard → JwtAuthGuard → RolesGuard`): 기본적으로 모든 라우트를 인증 필수로 두고, `@Public()`이 붙은 라우트만 예외로 허용하는 화이트리스트 방식을 택했습니다. 신규 엔드포인트를 추가할 때 인증 처리를 빠뜨리는 실수(보안 사고의 흔한 원인)를 구조적으로 방지합니다.
2. **AppException + ErrorCode Enum**: 서비스 레이어는 `NotFoundException` 같은 NestJS 기본 예외 대신 `new AppException(ErrorCode.POST_NOT_FOUND)`만 던지도록 강제해, 4단계 API 명세의 표준 에러 코드 표와 실제 코드가 항상 일치하도록 설계했습니다.
3. **TransformInterceptor의 `{ items, meta }` 관례**: 목록 조회 서비스가 이 모양으로 반환하면 인터셉터가 자동으로 `data`/`meta`로 분리합니다. 컨트롤러가 응답 포맷을 신경 쓰지 않아도 되어 관심사가 분리됩니다.
4. **JwtStrategy의 상태 재검증**: 토큰 서명 검증뿐 아니라, DB에서 사용자 상태(`ACTIVE`인지)를 매 요청마다 재확인합니다. 6단계에서 확정한 "탈퇴는 익명화" 정책과 맞물려, 탈퇴 후에도 기존 Access Token으로 접근 가능해지는 취약점을 막습니다.
5. **Prisma를 `@Global()` 모듈로 등록**: 커넥션 풀은 앱 전체에서 하나만 유지하는 것이 정석이므로, 매 도메인 모듈이 반복 import할 필요 없게 했습니다.
6. **Dockerfile 4단계 빌드**: `deps → build → prod-deps → runner`로 분리해 최종 이미지에는 devDependencies가 전혀 포함되지 않으며, `prisma`는 마이그레이션 실행을 위해 예외적으로 production dependency로 유지했습니다.

---

## 3. 컴파일/설치 검증 결과

```
npm install        → 성공 (796 packages)
tsc --noEmit        → 오류 1건
  src/modules/auth/strategies/jwt.strategy.ts:8 — "@prisma/client"에 UserStatus가 없음
```

이 1건은 코드 결함이 아니라 **샌드박스 네트워크 정책상 Prisma 쿼리 엔진 바이너리(`binaries.prisma.sh`)를 다운로드할 수 없어 `prisma generate`를 실행하지 못했기 때문**입니다. 실제 개발 환경이나 CI에서는 `npx prisma generate`가 정상 동작하며 이 오류는 즉시 사라집니다. 그 외 20여 개 파일은 전부 타입 오류 없이 컴파일되었습니다.

---

## 4. 코드 리뷰 — 발견된 개선 포인트

1. **`PrismaService`의 로그 이벤트 타입 캐스팅(`as never`)**: Prisma 6 계열의 로그 이벤트 타입 정의가 `log: [{emit:'event', level:...}]` 옵션 조합에 따라 오버로드가 까다로워 임시로 `as never`를 사용했습니다. `prisma generate` 실행 후 실제 생성된 타입을 보고 캐스팅 없이 타입이 맞는지 재확인이 필요합니다 (현재는 네트워크 제약으로 확인 불가).
2. **Refresh Token 발급/회전 로직 부재**: 이번 단계는 Access Token 검증(`JwtStrategy`)까지만 구현했습니다. Refresh Token 서명에는 별도 비밀키(`JWT_REFRESH_SECRET`)를 쓰기로 설계했는데, 이를 위한 두 번째 `JwtService` 인스턴스(커스텀 프로바이더)는 다음 단계(Auth 개발)에서 추가해야 합니다.
3. **Rate Limit 세분화 미적용**: 현재 `ThrottlerModule.forRoot`로 전역 기본값(1분 100회)만 설정했습니다. 4단계에서 논의한 로그인/게시글 작성 등 엔드포인트별 세분화(`@Throttle()` 오버라이드)는 각 도메인 컨트롤러 구현 시점(다음 단계 이후)에 적용합니다.
4. **`RedisService`의 범용성**: 현재는 문자열 get/set/incr 위주로만 감쌌습니다. 인기글 랭킹(ZSET), Pub/Sub(WebSocket 확장 대비) 기능은 실제로 필요해지는 시점(랭킹 모듈, 알림 모듈 개발 시)에 `RedisService`에 메서드를 추가하는 방식으로 확장할 계획입니다 — 지금 미리 만들지 않은 이유는 실제 사용처 없이 인터페이스를 설계하면 과설계가 될 위험이 있기 때문입니다.
5. **`docker-compose.yml`에 Nginx 미포함**: 원래 계획대로 Nginx 리버스 프록시는 10단계(배포)에서 추가합니다. 지금은 로컬 개발 편의를 위해 `api` 컨테이너를 3000번 포트로 직접 노출했습니다.
6. **Swagger `ApiResponseDto` 제네릭 노출 미완성**: 공통 응답 DTO는 만들어 두었지만, 실제 도메인 DTO(`PostResponseDto` 등)가 아직 없어 `@ApiExtraModels` + `getSchemaPath` 조합 적용은 다음 단계 이후 각 컨트롤러에서 진행합니다.

---

## 5. 실행 방법 (검토용)

```bash
# 1) 압축 해제 후 apps/api로 이동
cp apps/api/.env.example apps/api/.env   # 값 채우기 (JWT 시크릿 등)

# 2) 전체 스택 기동
docker compose up -d --build

# 3) (최초 1회) 마이그레이션 생성 - FTS SQL은 docs/02_fts_setup.sql 내용을 수동 병합 후 진행
docker compose exec api npx prisma migrate dev --name init

# 4) 시드 데이터 적재
docker compose exec api npx prisma db seed

# 5) 헬스체크 확인
curl http://localhost:3000/v1/health
# 6) Swagger 문서
open http://localhost:3000/v1/docs
```

---

다음 단계(Auth 개발 — 회원가입/로그인/토큰 발급/Refresh 회전/이메일 인증/비밀번호 찾기)로 진행하기 전에, 위 개선 포인트(특히 1번, 2번)에 대한 확인을 부탁드립니다.
