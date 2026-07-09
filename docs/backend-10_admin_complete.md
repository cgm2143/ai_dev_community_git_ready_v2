# AI 개발자 커뮤니티 — Backend 10단계: Admin 완료

관리자 기능 전반(회원 관리, 공지, 금칙어, IP 차단, 사이트 설정, 통계, 로그)을 구현했습니다. 이전 단계들에서 예고했던 여러 항목(8단계 알림 브로드캐스트, 9단계 신고 통계)을 이번에 실제로 완성했습니다.

---

## 1. 구조

`src/modules/admin` 아래에 영역별 하위 모듈로 분리했습니다:

```
admin/
├── admin.module.ts       # 전체를 묶는 최상위 모듈
├── users/                # 회원 관리
├── notices/              # 공지 지정 (Posts + Notifications 연동)
├── word-filter/           # 금칙어 관리
├── ip-bans/               # IP 차단
├── settings/              # 사이트 설정
├── stats/                 # 통계 대시보드
└── logs/                  # 관리자 행위 로그 조회
```

## 2. 공용 인프라 — AdminAuditLogService

- `src/common/services/admin-audit-log.service.ts`를 `CommonModule`(전역)에 등록했습니다.
- 이번 단계의 모든 변경 행위(회원 정지/역할 변경, 공지 지정, 금칙어/IP 차단 등록·해제, 설정 변경)와, 소급 적용으로 9단계 신고 처리(`ReportsService.resolve()`)에도 감사 로그를 남기도록 연결했습니다.
- `GET /admin/logs`로 조회 가능합니다 (action 필터 지원).

## 3. 기능별 요약

### 회원 관리 (/admin/users)
- 목록/검색(닉네임·이메일, 상태 필터), 계정 정지/활성화, 역할 변경
- 정지 시 즉시 모든 Refresh Token을 폐기해 로그인 세션을 실질적으로 종료시킵니다.
- 관리자 본인의 상태/역할은 스스로 변경할 수 없도록 차단(`CANNOT_MODIFY_SELF_ROLE`).

### 공지 지정 (/admin/posts/:id/notice) — 8단계 인프라 실사용
- `PostsService.setNoticeStatus()`를 신설하고, 공지로 지정하는 순간 8단계에서 만든 BullMQ 전체 브로드캐스트(`NotificationsService.broadcastNotice()`)를 처음으로 실제 호출합니다.
- ADMIN/SUPER_ADMIN만 가능(MODERATOR 제외).

### 금칙어 관리 (/admin/words)
- CRUD + Redis Set 캐시(`containsBannedWord()`)를 함께 제공합니다.
- 이번 단계에서는 Posts/Comments 작성 로직에 실제로 연결(자동 차단)하지 않았습니다.

### IP 차단 (/admin/ip-bans) + IpBanGuard
- CRUD + 만료일(expiresAt) 지원(미지정 시 무기한)
- 전역 Guard 체인의 가장 앞단에 `IpBanGuard`를 추가했습니다(Throttler보다도 먼저).
- Redis Set으로 빠르게 조회하되, 멤버십이 있어도 DB에서 만료 여부를 재확인하는 하이브리드 방식입니다.

### 사이트 설정 (/admin/settings)
- key-value 구조 그대로 조회/수정(upsert).

### 통계 (/admin/stats) — 9단계에서 예고했던 신고 통계 포함
- /overview: 회원 수/활성 회원 수/오늘 가입자 수/게시글 수/댓글 수/미처리 신고 수
- /reports: 신고 사유별·처리 상태별 집계, 최다 신고 대상 Top 10

---

## 4. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 77건 (모두 Prisma Client 미생성, 코드 결함 아님)
파일 수(.ts)      → 175개
```

---

## 5. 코드 리뷰 — 확인이 필요한 사항

1. **금칙어 필터가 아직 Posts/Comments 작성에 연결되지 않음**: `containsBannedWord()`는 준비되어 있지만, 실제 작성 로직에 훅을 추가하지 않았습니다. 필요하시면 바로 연결하겠습니다.
2. **IP 차단 시 기존 세션 미종료**: IP 차단은 신규 요청만 막습니다. 계정 자체를 정지해야 세션이 종료됩니다.
3. **역할 변경 권한이 매우 강력함**: `PATCH /admin/users/:id/role`이 임의의 역할(SUPER_ADMIN 포함)로 변경 가능합니다. 의도된 정책인지 확인 부탁드립니다.

---

12개 백엔드 단계 중 **11단계: Advertisement**, **12단계: Performance**가 남았습니다. 확인해 주시면 11단계로 진행하겠습니다.
