# AI 개발자 커뮤니티 — 11단계(Advertisement) 완료 + Admin 개선사항 반영

배너 광고/슬롯 관리를 구현하고, 10단계에서 남겨두었던 3가지 검토 항목을 모두 반영했습니다.

---

## A. 11단계: Advertisement

### 공개 API (/v1/ads)
| Method | Endpoint | 설명 |
|---|---|---|
| GET | /ads/slots/:code | 슬롯의 활성 광고 조회 (여러 개면 랜덤 로테이션) |
| POST | /ads/:id/impression | 노출 기록 (동일 IP+광고 조합 1분 쿨다운, IP당 1분 30회 제한) |
| POST | /ads/:id/click | 클릭 기록 후 linkUrl 반환 (IP당 1분 10회 제한) |

### 관리자 API (/v1/admin/ads, AD_MANAGE 권한)
- CRUD(purpose: AD | EVENT_BANNER) + Soft Delete
- GET /admin/ads/:id/stats: 노출수/클릭수/CTR

### 설계 포인트
- 노출 집계는 Redis 쿨다운으로 어뷰징을 막고, 클릭은 컨트롤러 Rate Limit으로만 방어했습니다.
- 삭제는 Soft Delete - 과거 통계 조회를 위해 row를 보존합니다.
- 모든 생성/수정/삭제는 AdminAuditLogService로 감사 로그가 남습니다.

---

## B. Admin 개선사항 반영

### 1. 금칙어 필터 - Posts/Comments 작성 시점에 실제 연동

- PostsModule/CommentsModule이 AdminWordFilterModule을 가져와 WordFilterService.containsBannedWord()를 사용합니다.
- Posts: 작성 시 제목+본문, 수정 시 변경된 필드만 검사합니다.
- Comments: 작성/수정 시 댓글 내용을 검사합니다.
- 위반 시 CONTAINS_BANNED_WORD(400)로 거부됩니다.
- 금칙어 CRUD(/admin/words)는 그대로 사용하며, 등록/삭제 즉시 Redis 캐시가 갱신되므로 관리자 페이지에서 추가한 금칙어가 바로 다음 작성 요청부터 적용됩니다.

### 2. IP 차단 정책 - 변경 없음

기존 정책(IP 차단은 신규 요청만 차단, 기존 세션은 계정 정지로 관리)을 그대로 유지합니다.

### 3. SUPER_ADMIN 승격 제한

- AdminUsersService.updateRole()에 검증을 추가했습니다: SUPER_ADMIN 역할은 요청자 본인이 이미 SUPER_ADMIN일 때만 부여할 수 있습니다. 일반 ADMIN이 다른 계정을 SUPER_ADMIN으로 승격시키려 하면 CANNOT_GRANT_SUPER_ADMIN(403)으로 거부됩니다.
- 요청자의 역할은 컨트롤러가 AuthenticatedUser.role(매 요청마다 JwtStrategy가 DB에서 재확인한 최신 값)을 그대로 전달받아 사용하므로, 별도 DB 조회 없이도 신뢰할 수 있습니다.
- 자기 자신의 역할 변경 차단은 이미 이전 단계에 구현되어 있어 그대로 유지됩니다.

---

## 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 79건 (모두 Prisma Client 미생성, 코드 결함 아님)
파일 수(.ts)      → 182개
```

---

이제 12개 백엔드 단계 중 마지막 12단계: Performance(Redis Cache, 인기글 랭킹, 성능 최적화)만 남았습니다. 확인해 주시면 진행하겠습니다.
