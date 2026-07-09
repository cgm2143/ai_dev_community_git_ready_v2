# AI 개발자 커뮤니티 — 7단계-1 개선 반영 + Auth 모듈 구현 완료

요청하신 7가지 개선사항을 모두 반영하고, Auth 모듈(회원가입/로그인/Refresh Rotation/다중 기기/로그아웃)까지 구현했습니다. `npm install` + `tsc --noEmit`으로 재검증했고, 남은 오류는 이전과 동일하게 **Prisma 엔진 다운로드 차단(샌드박스 네트워크 제약)으로 인한 2건**뿐입니다 (`UserStatus` 타입 미노출 — `prisma generate` 실행 시 해결).

---

## 1. Config → Zod 전환
- `src/config/env.validation.ts`를 Joi에서 Zod로 재작성 (`validateEnv` 함수, `ConfigModule.forRoot({ validate })`로 연결)
- 필드별 오류를 한 번에 모아서 보여주고(`abortEarly` 불필요), `z.coerce`로 문자열 → 숫자 변환 처리
- `package.json`에서 `joi` 제거, `zod` 추가

## 2. Logger — Request ID / User ID / Response Time
- `src/infra/logger/logger.module.ts`: `customProps`로 `requestId`, `userId`(인증된 경우)를 완료 로그 최상위 필드로 노출. `responseTime`은 pino-http가 기본 제공
- `src/common/interceptors/logging.interceptor.ts`: 애플리케이션 레벨 로그에도 `requestId`/`userId`/`responseTimeMs`(hrtime 기반, ms 소수점 2자리)를 함께 기록

## 3. RedisService 확장 (Cache / ZSET / Pub-Sub)
- **Cache**: `get/set/getJson/setJson/delete/exists/ttl/expire/incr`
- **Sorted Set(랭킹)**: `zAdd/zIncrBy/zScore/zRevRangeWithScores/zRemove/zRemoveRangeByScore`
- **Pub/Sub**: `publish/publishJson/subscribe/unsubscribe` — 구독 전용 커넥션을 `duplicate()`로 분리하고, 채널당 다중 핸들러를 `Map<string, Set<Handler>>`로 관리해 실제 `SUBSCRIBE`는 채널당 1회만 호출
- 향후 랭킹 모듈, WebSocket Gateway(Pub/Sub 기반 다중 인스턴스 브로드캐스트)가 이 인터페이스를 그대로 재사용

## 4. Health Check 확장
- PostgreSQL/Redis 연결 상태 + 응답 지연시간(ms)
- 메모리 사용량(rss/heapUsed/heapTotal/external, MB 단위)
- 버전(`package.json`), Uptime(초)
- 의존성 이상 시 HTTP 상태 코드도 **503**으로 응답하도록 수정 (기존에는 200 + degraded 텍스트만 반환하던 것을 수정 — 오케스트레이션 도구가 실제로 감지 가능하도록)

## 5. 에러 응답 공통 포맷 통일
- `HttpExceptionFilter`가 반환하는 모든 에러 응답에 `timestamp`(ISO 8601) 추가
- 최종 포맷: `{ success: false, error: { code, message, details }, timestamp }`
- Swagger 문서화용 `ApiErrorResponseDto` 신규 추가

## 6. Soft Delete(`deletedAt`) 적용
- `Post`, `Comment`, `Ad`(배너/공지 광고) 모델에 `deletedAt DateTime?` 추가 + 인덱스 부여
- `Comment.isDeleted`(Boolean)는 `deletedAt`으로 대체 — 삭제 여부뿐 아니라 **삭제 시점**까지 기록해 복구 기능(휴지통) 및 자동 파기 정책에 활용 가능
- `Post.status`(PUBLISHED/HIDDEN/DELETED) enum은 그대로 유지 — "표시 상태"와 "실제 삭제 시각"을 별도 축으로 관리 (상태 전이 로직과 복구 가능 여부를 분리해서 설계)

## 7. Auth 모듈 전체 구현

### 구조
```
src/modules/auth/
├── auth.module.ts          # AuthController/Service, 2개의 JwtService(access/refresh) 등록
├── auth.controller.ts       # register/login/refresh/logout/logout-all
├── auth.service.ts          # 회원가입, 로그인, Refresh Rotation, 로그아웃 로직
├── auth.constants.ts        # 쿠키 이름/경로, REFRESH_JWT_SERVICE 토큰
├── dto/
│   ├── register.dto.ts      # 이메일/비밀번호(영문+숫자+특수문자, 8~72자)/닉네임 검증
│   ├── login.dto.ts
│   └── auth-response.dto.ts
├── services/
│   ├── password.service.ts  # bcryptjs 해시(salt rounds 12)
│   └── token.service.ts     # Access/Refresh 서명, Refresh 해시(SHA-256)
├── strategies/jwt.strategy.ts
└── types/jwt-payload.interface.ts
```

### Refresh Token Rotation
1. `POST /auth/login` → Access Token(응답 바디) + Refresh Token(HttpOnly/Secure/SameSite=Strict 쿠키, `path=/v1/auth`로 노출 범위 제한) 동시 발급
2. `POST /auth/refresh` → 쿠키의 Refresh Token을 서명 검증 → DB에서 **해시(SHA-256) 매칭**으로 세션 row 조회 → 기존 row `revokedAt` 처리(회전) → 새 Access/Refresh 쌍 발급 및 쿠키 재설정
3. **재사용 탐지(Reuse Detection)**: 이미 회전되어 사라진(또는 폐기된) Refresh Token이 다시 사용되면, 이는 토큰 탈취 가능성을 의미하므로 **해당 사용자의 모든 세션을 즉시 폐기**하고 재로그인을 요구

### Refresh Token 해시 저장
- 원문은 저장하지 않고 `SHA-256` 해시만 DB(`refresh_tokens.token_hash`)에 저장
- 비밀번호와 달리 Refresh Token은 이미 높은 엔트로피를 가진 랜덤 값이라 bcrypt 같은 느린 해시가 불필요하다고 판단해 빠른 해시를 사용 (문서에 근거 명시)

### 다중 기기 로그인
- `refresh_tokens` 테이블에 사용자당 여러 row가 동시에 존재할 수 있는 구조(1:N) — 기기/브라우저별로 독립된 세션 유지
- `POST /auth/logout-all`로 현재 사용자의 모든 활성 세션을 한 번에 종료 가능 (계정 탈취 의심 시 사용자가 직접 사용 가능)

### 로그아웃 시 토큰 무효화
- `POST /auth/logout`: 쿠키의 Refresh Token 하나만 `revokedAt` 처리 (현재 기기만 로그아웃, 멱등 처리로 이미 무효화된 토큰이어도 에러 없이 종료)
- 로그인 실패 시 "이메일 없음"과 "비밀번호 불일치"를 동일한 `INVALID_CREDENTIALS`로 응답해 이메일 존재 여부가 노출되지 않도록 처리

---

## 8. 부트스트랩 버그 수정 (이번 리뷰 중 발견)

`main.ts`에서 `setGlobalPrefix('v1')`와 `enableVersioning(URI, defaultVersion:'1')`을 동시에 사용하고 있었는데, 이 조합은 모든 라우트 경로가 `/v1/v1/...`로 중복되는 문제가 있었습니다. `enableVersioning`을 제거하고 `setGlobalPrefix`만 사용하도록 수정했습니다 (4단계 API 명세의 `/v1/...` 경로 규칙과 일치).

---

## 9. 검증 결과

```
npm install        → 성공
tsc --noEmit        → 오류 2건 (모두 Prisma 엔진 미생성으로 인한 UserStatus 타입 이슈, 코드 결함 아님)
파일 수              → 35개 (.ts)
```

---

## 10. 남은 다음 단계 후보

Auth는 이번에 상세 구현까지 완료했습니다. 다음으로 이어갈 도메인 우선순위를 다음 중에서 선택해 주시면 바로 진행하겠습니다.
1. **Posts(게시글)** — 게시판 목록/상세, 작성/수정/삭제(Soft Delete), 조회수(Redis 배치 반영)
2. **Comments(댓글)** — 대댓글, Soft Delete
3. **Reactions/Bookmarks** — 추천/비추천/북마크
4. 그 외 우선순위를 직접 지정
