# AI 개발자 커뮤니티 — Auth 단계 최종 반영 (3가지 방향성)

지시하신 3가지 방향으로 반영했습니다. 재검증 결과 `tsc --noEmit` 오류는 이전과 동일하게 Prisma 엔진 미생성으로 인한 2건뿐입니다.

---

## 1. BullMQ 전용 Redis 커넥션 — 확장 가능한 설정 구조

- `configuration.ts`에 `queueRedis` 설정을 신설했습니다. `QUEUE_REDIS_HOST/PORT/PASSWORD` 환경변수가 없으면 기존 `REDIS_HOST/PORT/PASSWORD` 값을 그대로 상속받아 사용하되, **애플리케이션 레벨에서는 이미 캐시용 커넥션과 완전히 분리된 별도 TCP 커넥션**입니다 (BullMQ가 요구하는 `maxRetriesPerRequest: null` 설정도 캐시 커넥션과 다르게 독립적으로 적용됨).
- 향후 운영 규모가 커져 큐 전용 Redis 인스턴스로 분리해야 할 때는 `QUEUE_REDIS_*` 값만 채우면 되고, `QueueModule`의 코드는 전혀 손댈 필요가 없습니다.
- `.env.example`에 관련 항목을 추가하고, 코드 주석에 설계 의도를 명시했습니다.

## 2. Throttler — 인메모리 유지, 12단계에서 Redis 전환 예정

- 이번 단계에서는 코드 변경 없이 현재의 인메모리 저장소를 그대로 유지합니다.
- 12단계(Performance)에서 `@nest-lab/throttler-storage-redis` 등으로 교체하는 계획을 이전 리뷰 문서에 기록해 두었으며, 별도 조치 없이 그대로 진행합니다.

## 3. 이메일 인증 쿨다운 — 안내 문구 + 남은 시간 노출

- 에러 메시지를 `"인증 메일은 잠시 후 다시 시도해 주세요"` 같은 모호한 문구 대신, **정확한 남은 초를 계산해 문구에 직접 포함**하도록 변경했습니다.
  - 예: `"인증 메일은 47초 후 다시 발송할 수 있습니다."`
  - `Redis.ttl(cooldownKey)`로 실제 남은 시간을 조회해 사용하므로, 60초 중 몇 초가 지났든 항상 정확합니다.
- 에러 응답의 `error.details`에 `{ retryAfterSeconds: number }`를 함께 실어, 프론트엔드가 문구를 다시 파싱하지 않고도 카운트다운 UI를 구현할 수 있게 했습니다.
- `HttpExceptionFilter`가 `details.retryAfterSeconds`를 감지하면 표준 `Retry-After` HTTP 헤더도 함께 설정하도록 확장했습니다 — REST 관례를 따르는 클라이언트/프록시가 헤더만으로도 재시도 시점을 알 수 있습니다.
- **회원가입 직후 자동 발송에도 동일한 쿨다운이 적용됩니다.** 최초 가입 시에는 쿨다운 키가 없으므로 정상 발송되고, 그 즉시 60초 쿨다운이 걸립니다. 따라서 가입 직후 사용자가 바로 "재발송"을 누르면 동일하게 안내 문구가 노출됩니다. 다만 이 예외가 회원가입 자체를 실패시키지 않도록 `AuthService.register()`에서 한 번 더 방어적으로 예외를 흡수하도록 보강했습니다.

---

## 응답 예시

```json
// POST /auth/email/send-verification (쿨다운 중)
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "인증 메일은 47초 후 다시 발송할 수 있습니다.",
    "details": { "retryAfterSeconds": 47 }
  },
  "timestamp": "2026-07-07T12:00:00.000Z"
}
```
응답 헤더에도 `Retry-After: 47`이 함께 내려갑니다.

---

## 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 2건 (Prisma 엔진 미생성, 코드 결함 아님)
파일 수(.ts)      → 47개
```

---

이 상태로 확인해 주시면 **2단계: User(프로필 조회/수정, 닉네임 변경, 회원 탈퇴)**로 진행하겠습니다.
