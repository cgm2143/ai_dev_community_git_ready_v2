# AI 개발자 커뮤니티 — Auth 4대 정책 반영 완료

지시하신 4가지 정책을 모두 반영했습니다. `npm install` + `tsc --noEmit`으로 재검증했고, 남은 오류는 이전과 동일하게 Prisma 엔진 미생성으로 인한 2건뿐입니다.

---

## 1. 이메일 미인증 사용자 정책

- 로그인은 그대로 허용 (`AuthService.login`에 별도 차단 로직 없음)
- `AuthenticatedUser`에 `emailVerified: boolean` 추가, `JwtStrategy.validate()`가 **매 요청마다 DB에서 최신 인증 상태를 조회**해 채움 (JWT 페이로드에 굽지 않음 — 인증 완료 후 재로그인 없이도 즉시 반영되도록)
- `@RequireEmailVerified()` 데코레이터 + `EmailVerifiedGuard`를 신설, 전역 Guard 체인 마지막에 등록(`Throttler → Jwt → Roles → EmailVerified`)
- **현재 커뮤니티 활동(게시글/댓글/추천/북마크/쪽지) 엔드포인트 자체가 아직 구현되지 않았으므로**, 이번 단계에서는 게이팅 인프라(데코레이터+가드)만 구축했습니다. 4~9단계(Posts/Comments/Reactions/Bookmarks 등)에서 실제 작성 엔드포인트에 `@RequireEmailVerified()`만 붙이면 즉시 적용됩니다.

## 2. 이메일 발송 재시도 (BullMQ)

- `src/infra/queue`에 BullMQ 기반 `mail` 큐 신설 (`QueueModule` — Queue + Worker를 함께 기동/종료 관리)
- 재시도 스케줄: **30초 → 2분 → 10분**, 최초 시도 포함 총 4회. BullMQ의 `Worker` `settings.backoffStrategy`로 정확한 지연시간을 직접 계산해 반환 (내장 exponential/fixed로는 이 비균등 간격을 표현할 수 없어 커스텀 전략 사용)
- 모든 재시도 소진 시 `worker.on('failed', ...)`에서 구조화 로그(`requestId` 체계와 동일하게 `jobId`, `attemptsMade`, `to` 포함)를 남기고 종료
- `EmailVerificationService`/`PasswordResetService`는 이제 `MailerService`를 직접 호출하지 않고 `MailQueueService.enqueue()`로 큐에 적재만 함 — 발송 채널(SMTP)과 발송 신뢰성(재시도)이 계층으로 분리됨
- **재발송 API는 동일 이메일 기준 1분 1회로 제한**: `email-verify-cooldown:{email}` 키를 Redis에 60초 TTL로 저장. 계정 존재 여부와 무관하게 항상 동일하게 쿨다운을 적용해, "쿨다운 에러가 뜨는지 여부"로 계정 존재 여부가 유추되지 않도록 함

## 3. 비밀번호 찾기/재설정 (Auth 단계에 포함)

- `PasswordResetService` 신설 — 이메일 인증 토큰과 동일한 패턴(Redis 저장, SHA-256 해시, 1회성)이지만 **TTL은 1시간**(이메일 인증 24시간보다 짧게) — 비밀번호 재설정은 계정 탈취와 직결되는 민감한 흐름이므로 노출 시간을 최소화
- `POST /auth/password/forgot`: 계정 존재 여부와 무관하게 항상 204 (동일 응답)
- `POST /auth/password/reset`: 토큰 검증 → 비밀번호 변경 → **해당 사용자의 모든 Refresh Token을 트랜잭션 내에서 함께 폐기**(모든 기기 로그아웃) — 비밀번호 유출로 인한 재설정 상황이라면 공격자의 기존 세션도 함께 끊어야 하기 때문
- 토큰은 사용 즉시 Redis에서 삭제되어 재사용 불가

## 4. Rate Limit 세분화 (Auth 엔드포인트)

`@nestjs/throttler`의 `@Throttle({ default: { limit, ttl } })`로 라우트별 재정의(전역 기본값인 1분 100회보다 훨씬 엄격):

| 엔드포인트 | 제한 | 근거 |
|---|---|---|
| `POST /auth/register` | IP당 10분에 5회 | 대량 계정 생성 방지 |
| `POST /auth/login` | IP당 5분에 10회 | 브루트포스 방지 |
| `POST /auth/refresh` | IP당 1분에 20회 | 정상적인 무음 재발급 흐름은 방해하지 않으면서 남용 차단 |
| `POST /auth/email/send-verification` | IP당 1시간에 5회 + **이메일당 1분에 1회**(서비스 레이어) | 메일 폭탄 방지 |
| `POST /auth/password/forgot` | IP당 1시간에 5회 | 메일 폭탄/계정 스캐닝 방지 |
| `POST /auth/password/reset` | IP당 1시간에 10회 | 토큰 무차별 대입 방지 |

추가로 `main.ts`에 `app.set('trust proxy', 1)`을 설정해, 향후 Nginx 리버스 프록시 뒤에서도 `req.ip`(Throttler의 기본 추적 키)가 실제 클라이언트 IP를 정확히 가리키도록 했습니다.

---

## 5. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 2건 (Prisma 엔진 미생성, 코드 결함 아님)
파일 수(.ts)      → 47개
```

---

## 6. 코드 리뷰 — 확인이 필요한 사항

1. **BullMQ 전용 Redis 커넥션**: 기존 `RedisService`의 공용 커넥션과 별도로, `QueueModule`이 BullMQ 전용 커넥션을 자체적으로 생성합니다(BullMQ의 요구사항인 `maxRetriesPerRequest: null` 때문에 공용 커넥션과 설정이 달라야 함). 운영 환경에서 Redis 커넥션 수 상한(maxclients)을 여유 있게 설정해야 합니다.
2. **Throttler 저장소가 인메모리**: 현재 `@nestjs/throttler`는 기본 인메모리 저장소를 사용합니다. 서버가 2대 이상으로 수평 확장되면 인스턴스별로 카운터가 분리되어 실제 허용량이 인스턴스 수만큼 늘어나는 효과가 생깁니다. 다중 인스턴스 운영 시점(12단계 Performance 또는 그 이전)에 `@nest-lab/throttler-storage-redis` 같은 Redis 기반 저장소로 교체하는 것을 권장합니다.
3. **이메일당 쿨다운의 전역성**: `email-verify-cooldown`는 회원가입 시 자동 발송에도 동일하게 적용되지는 않습니다(자동 발송은 쿨다운 체크를 거치지 않고 `sendVerificationEmail` 내부에서 그대로 쿨다운을 설정만 함 — 즉 가입 직후 바로 재발송 버튼을 눌러도 1분 내라면 429가 뜹니다). 의도된 동작이지만, UX상 "방금 보냈어요" 안내 문구를 프론트에서 함께 보여주는 것을 권장합니다.

---

이 상태로 확인해 주시면 **2단계: User(프로필 조회/수정, 닉네임 변경, 회원 탈퇴)**로 진행하겠습니다.
