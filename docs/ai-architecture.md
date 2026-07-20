# AI 아키텍처 & 운영 가이드

COBION의 AI 기능(요약 · 태그 추천)과 그 운영 구조(Queue/Worker 분리, 관측성, 비용 보호)를 설명합니다.

---

## 1. 전체 아키텍처

```
                 ┌──────────────────────────── API 프로세스 (APP_ROLE=api) ─────────────────────────┐
   사용자 ──HTTP──▶  AiController ──▶ AiAnalysisService ──▶ AI_PROVIDER (Anthropic | Stub)          │
                 │        │                 │  enqueue                                              │
                 │        │                 └──────────────▶ QueueModule (Producer, @Global)        │
                 │        └── suggest-tags(동기) ─────────────────┐                                  │
                 └──────────────────────────────────────────────┼──────────────────────────────────┘
                                                                 │ Redis (BullMQ)
                 ┌──────────────────────── Worker 프로세스 (APP_ROLE=worker) ────────────┼──────────┐
                 │  WorkerModule ▶ WorkersService ▶ ai-summary Worker ──▶ AiAnalysisService.generate │
                 │                                    │ 실패(재시도 소진) ──▶ DeadLetterService(DLQ)   │
                 └──────────────────────────────────────────────────────────────────────────────────┘
                                                                 │
                                                    PostgreSQL: AiAnalysis(캐시) + AiRequestLog(관측)
```

- **API 프로세스**와 **Worker 프로세스**는 **동일 코드베이스·동일 이미지**를 쓰며 `APP_ROLE`로 역할만 분기합니다.
- **Provider 자동 폴백**: `ANTHROPIC_API_KEY`가 있으면 `AnthropicAiProvider`, 없으면 `StubAiProvider`.

## 2. Queue Flow (Producer)

- `QueueModule`(@Global)은 **Queue 인스턴스 + 얇은 프로듀서 서비스만** 제공합니다. Worker는 만들지 않습니다.
- 큐: `mail`, `notification-broadcast`, `ranking-recalculation`, `ai-summary`, `dead-letter`.
- API는 `AiSummaryQueueService.enqueue(postId)`로 작업만 적재합니다. `jobId: ai-summary:{postId}`로 중복 등록을 방지합니다.

## 3. Worker Flow (Consumer)

- `WorkerModule` → `WorkersService`가 **모든 BullMQ Worker를 소유·기동·종료**합니다(Worker 프로세스에서만 로드).
- 안정성: 시작/Ready/실패/에러/헬스(60s) 로그, **Graceful Shutdown**(SIGTERM/SIGINT → 진행 중 작업 완료 후 종료), 구조화 로그(`workerId`, `queueName`, `correlationId`).
- `ranking-recalculation` 반복 작업(5분)은 Worker가 기동 시 등록합니다.

## 4. Cache Flow

- 요약 결과는 `AiAnalysis(type=SUMMARY)`에 캐시됩니다(생성 메타: provider/model/promptVersion/promptHash/tokens/cost/responseTime).
- 상세 진입 시 `GET /ai/posts/:id/summary`:
  - 캐시 O + 프롬프트 시그니처 일치 → `ready`
  - 캐시 X 또는 시그니처 불일치 → 캐시 폐기 후 작업 등록 → `pending`(프론트는 **지수 백오프 polling**: 1→2→4→8→15s)
  - Stub이거나 대상 아님 → `unavailable`
- **글 수정(제목/본문)** 시 캐시 무효화.

## 5. Prompt Flow & 버전 관리

- 프롬프트는 `modules/ai/prompts/`에서 관리합니다(`summary.prompt.ts`, `tag.prompt.ts`).
- 버전: `SUMMARY_PROMPT_VERSION`, `TAG_PROMPT_VERSION`(env).
- **시그니처 = (version + 템플릿) SHA-256**. 버전을 올리거나 템플릿을 수정하면 시그니처가 바뀌어 **기존 캐시가 자동 무효화**됩니다.
- LLM 태그 응답은 **Zod로 런타임 검증**하고, 실패 시 안전 기본값(`[]`)으로 폴백합니다.

## 6. 관측성 (Observability)

- 모든 실제 LLM 호출(요약 생성·태그 추천)은 `AiRequestLog`에 1건 기록됩니다: provider/model/promptVersion/promptHash/tokens/cost/responseTime/success/errorReason/cacheHit/postId.
- 캐시 **조회**는 쓰기 증폭 방지를 위해 로깅하지 않습니다.
- 지표 API: `GET /admin/ai/metrics` — 총 요청/성공률/평균 응답시간/평균 토큰/오늘·이번달 비용/Provider 비율/Cache Hit/큐 대기/DLQ 수.

## 7. Dead Letter Queue

- 모든 재시도를 소진(최종 실패)한 Job은 `DeadLetterService.moveToDeadLetter`로 `dead-letter` 큐에 이동합니다(원본 큐/작업/데이터/사유 보존).
- 관리자 API: `GET /admin/ai/dead-letters`(목록), `POST /admin/ai/dead-letters/:id/requeue`(원본 큐로 재실행). UI는 미구현.

## 8. 비용 관리 (Cost Guard)

- 한도(env, 0이면 비활성): `AI_DAILY_COST_LIMIT`, `AI_MONTHLY_COST_LIMIT`, `AI_REQUEST_LIMIT_PER_HOUR`.
- AI 호출 직전 `AiCostGuardService.warnIfExceeded()`가 `AiRequestLog` 집계로 한도 초과 여부를 확인하고 **경고 로그만** 남깁니다(현재 차단하지 않음).
- 모델 단가는 `ai-cost.util.ts`의 표로 관리하며 `estimatedCost`(USD 근사)를 계산합니다.

## 9. 운영 방법

로컬 개발:
```bash
# 터미널 1: API
npm run start:dev
# 터미널 2: Worker
npm run start:worker:dev
```

프로덕션(빌드 후):
```bash
APP_ROLE=api    node dist/main.js        # 또는 npm start
APP_ROLE=worker node dist/worker.main.js  # 또는 npm run start:worker
```

## 10. Railway 배포 구조

동일 리포/이미지로 **2개 서비스**를 만들고 Redis·PostgreSQL을 공유합니다.

| Service | APP_ROLE | 시작 | 헬스체크 |
|---|---|---|---|
| `community-api` | `api`(기본) | 이미지 entrypoint(`node dist/main.js`) | `/v1/health` |
| `community-worker` | `worker` | 동일 entrypoint가 `APP_ROLE`로 `dist/worker.main.js` 분기 | **없음(HTTP 미노출)** |

- 두 서비스에 **동일한 DB/Redis 환경변수**를 설정합니다. worker 서비스에는 `APP_ROLE=worker`를 추가하고 **healthcheckPath를 비웁니다**(대시보드).
- 마이그레이션(`db push`)은 **api 서비스만** 수행합니다(worker는 entrypoint에서 건너뜀).

## 11. 장애 대응

- **AI 응답 실패**: 사용자에겐 "AI 요약을 생성할 수 없습니다."만 노출, 게시글 기능은 정상. 요약 작업은 3회 재시도 후 DLQ로 이동.
- **AI 전체 중단**: `ANTHROPIC_API_KEY` 제거 → Stub로 자동 폴백(요약 카드 숨김, 태그 빈 결과).
- **Worker 다운**: API는 영향 없음(작업만 큐에 쌓임). Worker 재기동 시 대기 작업 자동 소비.
- **DLQ 적체**: `GET /admin/ai/dead-letters`로 확인, 원인 해소 후 `requeue`로 재실행.
- **비용 급증**: Cost Guard 경고 로그 확인 → 한도 상향/모델 교체/일시적으로 키 제거.
