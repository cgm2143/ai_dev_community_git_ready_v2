# AI 개발자 커뮤니티 — Backend 8단계: Notifications 완료

댓글/답글/추천 알림과 실시간 WebSocket 푸시를 구현했습니다. 1단계에서 만들어 둔 Redis Pub/Sub과 6단계 `TargetValidator.getOwnerId()`를 이번에 처음 실전 사용했습니다.

---

## 1. 실시간 전달 구조 — Redis Pub/Sub 재사용

- `NotificationsService.create()`: DB에 저장 후 `RedisService.publishJson('notifications:broadcast', { userId, notification })`로 발행만 합니다.
- `NotificationsGateway`(`/ws/notifications` 네임스페이스): 부팅 시 이 채널을 한 번 구독하고, 수신한 페이로드의 `userId`에 해당하는 Socket.IO 룸(`user:{userId}`)으로만 재전송합니다.
- **왜 공식 Socket.IO Redis 어댑터 대신 이 방식을 택했나**: 1단계에서 만든 `RedisService.publish/subscribe`를 그대로 재사용해 인프라 일관성을 유지했습니다. 인스턴스가 여러 대로 늘어나도, 모든 인스턴스가 동일 채널을 구독하고 있으므로 대상 사용자가 어느 인스턴스에 붙어 있든 알림이 전달됩니다.
- 소켓 인증: 클라이언트가 연결 시 `auth.token`(또는 query token)으로 Access Token을 전달하면, `JwtStrategy`와 동일한 방식(서명 검증 + DB에서 `status=ACTIVE` 재확인)으로 인증한 뒤 사용자 전용 룸에 join시킵니다.

## 2. 알림 트리거 연동

| 트리거 | 알림 유형 | 수신자 | 발생 위치 |
|---|---|---|---|
| 게시글에 최상위 댓글 작성 | COMMENT | 게시글 작성자 | `CommentsService.create()` |
| 댓글에 대댓글 작성 | REPLY | 부모 댓글 작성자 | `CommentsService.create()` |
| 게시글/댓글 추천 | LIKE | 게시글/댓글 작성자 | `ReactionsService.react()` (DISLIKE→LIKE 전환 포함, 취소/역전환은 알림 없음) |
| 공지 발행 | NOTICE | (10단계 Admin에서 연동 예정) | - |

- **자기 알림 방지**: `actorId === userId`(자기 글에 자기가 댓글/추천)면 알림을 아예 생성하지 않습니다.
- **6단계에서 미리 만들어 둔 `TargetValidator.getOwnerId()`가 이번에 처음 실제로 쓰였습니다** — `ReactionsService`가 Posts/Comments 모듈을 직접 참조하지 않고 이 메서드로만 대상 작성자를 조회합니다.
- 알림 발송은 반응/댓글 생성 트랜잭션 바깥에서 처리해, Redis 발행 실패가 핵심 트랜잭션의 원자성에 영향을 주지 않도록 분리했습니다.

## 3. REST 엔드포인트

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/v1/notifications` | 내 알림 목록 (`unreadOnly=true` 필터, 응답에 `unreadCount` 포함) |
| PATCH | `/v1/notifications/read-all` | 전체 읽음 처리 |
| PATCH | `/v1/notifications/:id/read` | 개별 읽음 처리 |
| DELETE | `/v1/notifications/:id` | 알림 삭제 |

---

## 4. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 53건 (모두 Prisma Client 미생성, 코드 결함 아님)
파일 수(.ts)      → 136개
```

---

## 5. 코드 리뷰 — 확인이 필요한 사항

1. **공지(NOTICE) 알림 미연동**: 타입과 메시지 템플릿은 준비해 두었지만, 실제 발행 트리거는 10단계(Admin)에서 공지 작성 기능과 함께 연동합니다. 전체 회원 대상 발송은 대량 INSERT이므로, 그 시점에 배치/큐 처리 여부를 함께 결정하는 것을 제안드립니다.
2. **소켓 인증에 Refresh 미지원**: Access Token 만료 시 재연결이 필요하며, 자동 갱신은 프론트엔드 몫입니다.
3. **알림 자체의 Rate Limit/그룹핑 없음**: 짧은 시간에 댓글이 몰리면 알림도 그만큼 개별 생성됩니다. 필요하시면 "동일 유형+대상은 N분에 1회로 묶기" 같은 정책을 추가할 수 있습니다.

---

이 상태로 확인해 주시면 **9단계: Report(신고)**로 진행하겠습니다.
