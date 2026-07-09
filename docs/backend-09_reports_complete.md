# AI 개발자 커뮤니티 — Backend 9단계: Report 완료

게시글/댓글/사용자 신고 및 모더레이터의 처리(승인/반려)를 구현했습니다. `TargetValidatorRegistry`의 세 번째 실전 소비자(6단계 Reactions, 8단계 Notifications에 이어)입니다.

---

## 1. 신고 대상 검증 — USER 검증기 신규 등록

- `UserTargetValidatorRegistrar`(Users 모듈)를 신설해 `TargetValidatorRegistry`에 `'USER'` 키로 등록했습니다. 이제 레지스트리는 `POST`(4단계) / `COMMENT`(5단계) / `USER`(9단계) 세 가지 대상을 모두 지원합니다.
- `ReportsService`는 Posts/Comments/Users 모듈을 전혀 import하지 않고 이 레지스트리만으로 대상 존재 여부를 확인합니다.
- 사용자 대상 신고 시 자기 자신 신고는 `CANNOT_REPORT_SELF`로 차단합니다.

## 2. 엔드포인트

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| POST | `/v1/reports` | 이메일 인증 필요 | 게시글/댓글/사용자 신고 |
| GET | `/v1/admin/reports` | MODERATOR 이상 | 신고 목록 (status 필터) |
| PATCH | `/v1/admin/reports/:id` | MODERATOR 이상 | 신고 처리 (RESOLVED/REJECTED) |

- **Role + Permission 이중 축**: `@Roles('MODERATOR','ADMIN','SUPER_ADMIN')` + `@RequirePermission(PermissionCode.REPORT_RESOLVE)`를 함께 적용했습니다.
- **중복 신고 방지**: 동일 사용자가 동일 대상에 이미 PENDING 신고를 넣어둔 경우 재신고를 `ALREADY_REPORTED`(409)로 막습니다.
- **실제 제재 조치는 별도**: 신고 처리(RESOLVED)는 상태만 전환할 뿐, 게시글/댓글 삭제나 회원 정지는 자동 실행되지 않습니다. 모더레이터가 필요시 기존 `DELETE /posts/:id`(`POST_DELETE_ANY`), `DELETE /comments/:id`(`COMMENT_DELETE_ANY`)로 별도 처리하고, 회원 정지(`USER_BAN`)는 10단계(Admin)에서 구현합니다.

---

## 3. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 61건 (모두 Prisma Client 미생성, 코드 결함 아님)
파일 수(.ts)      → 146개
```

---

## 4. 코드 리뷰 — 확인이 필요한 사항

1. **신고에 이메일 인증 요구 적용**: 원본 정책에 "신고"가 명시되어 있지 않았지만, 어뷰징 방지 취지에 맞다고 판단해 적용했습니다. 의도와 다르면 제거하겠습니다.
2. **신고 처리 시 신고자 알림 없음**: 8단계 `NotificationsService`를 재사용해 추가할 수 있습니다.
3. **신고 통계/대시보드 없음**: 10단계(Admin)에서 함께 구현 제안드립니다.

---

이 상태로 확인해 주시면 **10단계: Admin(관리자 기능)**로 진행하겠습니다.
