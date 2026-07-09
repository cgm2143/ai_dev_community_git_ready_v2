# AI 개발자 커뮤니티 — Backend 1단계: Auth 모듈 완료

지난 턴에서 회원가입/로그인/JWT/Refresh Token Rotation은 이미 구현했고, 이번에 **이메일 인증**까지 추가해 1단계(Auth)를 마무리했습니다.

---

## 1. 이번에 추가된 기능

### 1.1 Mailer 인프라 (`src/infra/mailer`)
- `nodemailer` 기반 SMTP 발송, DI 토큰(`MAIL_TRANSPORTER`)으로 트랜스포터를 주입해 테스트 시 목(mock) 트랜스포터로 쉽게 교체 가능한 구조
- `MailerService.send()`의 시그니처만 유지하면, 추후 1단계 아키텍처 설계에서 계획했던 **BullMQ 비동기 발송으로 내부 구현만 교체** 가능 (호출부 변경 불필요)

### 1.2 이메일 인증 (`src/modules/auth/services/email-verification.service.ts`)
- 인증 토큰은 별도 DB 테이블 없이 **Redis에 24시간 TTL**로 저장 (`email-verify:{sha256(token)}` → `userId`) — 1회성/단기 데이터라 감사 목적의 영속 저장이 필요한 Refresh Token과는 다르게 설계
- `POST /auth/email/send-verification`: 이메일 존재/인증 여부와 무관하게 항상 동일한 응답(204) — 계정 존재 여부가 노출되지 않도록 함
- `POST /auth/email/verify`: 토큰 검증 후 `user.emailVerifiedAt` 설정, 토큰은 사용 즉시 Redis에서 삭제(재사용 방지)
- 회원가입 완료 시 인증 메일을 자동 발송하며, **발송 실패가 회원가입 자체를 실패시키지 않도록** 예외를 서비스 내부에서 흡수하고 로그만 남김

### 1.3 신규 환경변수
`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_SECURE`, `FRONTEND_URL` — 모두 Zod 스키마(`env.validation.ts`)에 추가해 누락 시 부팅 단계에서 즉시 에러로 드러납니다.

---

## 2. Auth 모듈 최종 엔드포인트 목록

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| POST | `/v1/auth/register` | Public | 회원가입 + 인증 메일 자동 발송 |
| POST | `/v1/auth/login` | Public | 로그인, Access Token(바디) + Refresh Token(HttpOnly 쿠키) 발급 |
| POST | `/v1/auth/refresh` | Public(쿠키 필요) | Refresh Token Rotation |
| POST | `/v1/auth/email/send-verification` | Public | 인증 메일 재발송 |
| POST | `/v1/auth/email/verify` | Public | 이메일 인증 확인 |
| POST | `/v1/auth/logout` | Required | 현재 기기 세션 종료 |
| POST | `/v1/auth/logout-all` | Required | 모든 기기 세션 종료 |

---

## 3. 코드 리뷰 — 이번 구현에서 발견한 개선 포인트

1. **이메일 인증이 로그인/게시글 작성을 막지 않음**: 현재는 인증 여부와 무관하게 로그인·이용이 가능합니다. 스팸/어뷰징 방지를 위해 "이메일 미인증 시 글쓰기 제한" 같은 정책이 필요하다면 2단계(User) 또는 4단계(Posts) 구현 시 `AuthenticatedUser`에 `emailVerifiedAt` 여부를 실어 Guard에서 체크하는 방식을 추가할 수 있습니다. 지금은 정책이 명시되지 않아 구현하지 않았습니다.
2. **메일 발송 재시도 정책 부재**: SMTP 서버 순단 시 인증 메일이 유실될 수 있습니다. 현재는 로그만 남기고 사용자가 "재발송" 버튼을 눌러야 합니다. 향후 BullMQ 도입 시 자동 재시도(exponential backoff)를 붙이는 것을 권장합니다.
3. **비밀번호 찾기(재설정) 미포함**: 이번 지시사항의 Auth 범위(회원가입/로그인/JWT/Refresh/이메일 인증)에는 없었지만, 4단계 API 명세에는 `/auth/password/forgot`, `/auth/password/reset`이 포함되어 있습니다. User 단계(비밀번호 변경)와 함께 처리할지, 지금 Auth에 추가할지 확인 부탁드립니다.
4. **Rate Limit 미세분화**: `/auth/login`, `/auth/email/send-verification`처럼 어뷰징에 취약한 엔드포인트에 아직 전역 기본값(1분 100회)만 적용되어 있습니다. 예를 들어 로그인은 IP+이메일 조합으로 더 엄격한 제한이 필요합니다 — Performance 단계(12단계)에서 일괄 적용하는 방안을 제안드립니다만, 필요하시면 지금 바로 적용할 수도 있습니다.

---

## 4. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 2건 (Prisma 엔진 미생성, 코드 결함 아님)
파일 수(.ts)      → 40개
```

---

이 상태로 확인해 주시면 **2단계: User(프로필 조회/수정, 닉네임 변경, 회원 탈퇴)** 로 진행하겠습니다.
