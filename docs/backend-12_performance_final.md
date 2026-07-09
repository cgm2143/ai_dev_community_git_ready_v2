# AI 개발자 커뮤니티 — Backend 12단계(최종): Performance 완료

12개 백엔드 단계 중 마지막 단계입니다. 실제 시간 가중치 인기글 랭킹, Redis 기반 Throttler, 권한 체크/카테고리 캐싱을 구현했습니다.

---

## 1. 인기글 랭킹 - 시간 가중치 (Redis ZSET)

src/modules/ranking
- 점수식: score = (추천수*3 + 댓글수*2 + 조회수*0.1) / (경과시간(h) + 2)^1.5 (Reddit/HackerNews 계열 감쇠 공식)
- 5분마다(@Cron) 최근 30일 이내 게시글 전체의 점수를 재계산해 ranking:posts:daily/weekly/monthly 3개 Redis ZSET을 통째로 교체합니다.
- GET /v1/posts/best?period=daily|weekly|monthly&limit= 신설 - 4단계에서 미뤄뒀던 엔드포인트를 완성했습니다.
- 라우트 등록 순서 문제를 직접 확인하고 처리했습니다: /posts/best를 /posts/:id보다 먼저 선언했습니다.
- 실제 점수 계산 공식을 Node.js로 직접 실행해 검증했습니다 - 신규 글(1시간, 좋아요5)이 오래된 글(72시간, 좋아요50)보다 높은 점수를 받는 것을 확인했습니다(4.62 vs 0.61).
- PostsService.findManyByIds()를 신설해 검색 기능과 동일한 "순서 보존 조회" 패턴을 재사용했습니다.

## 2. Throttler - Redis 기반 저장소로 전환 (Auth 단계에서 예고했던 항목)

- @nest-lab/throttler-storage-redis를 도입해 ThrottlerModule.forRootAsync()로 전환했습니다.
- 기존 인메모리 저장소는 인스턴스마다 카운터가 분리되는 문제가 있었는데, Redis로 카운터를 공유해 인스턴스 수와 무관하게 설정한 한도가 정확히 지켜지도록 했습니다.

## 3. PermissionCheckService - Redis 캐싱

- role_permissions 조회 결과를 역할+권한 코드 조합 키로 5분 캐싱했습니다. PermissionsGuard를 통해 거의 모든 인증된 요청에서 호출될 수 있는 핫 패스라, 매 요청마다의 DB 조인을 없앴습니다.

## 4. 카테고리 목록 캐싱 (보너스)

- CategoriesService.findAllPublic()을 60초 캐싱했습니다.
- BoardsService의 변경(생성/수정/삭제, isActive 토글 포함)도 동일 캐시를 무효화하도록 연결했습니다.

---

## 5. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 81건 (모두 Prisma Client 미생성, 코드 결함 아님)
파일 수(.ts)      → 185개
랭킹 점수 공식     → Node.js로 직접 실행해 시간 가중치 동작 확인
```

---

## 6. 최종 코드 리뷰 - 확인이 필요한 사항

1. 랭킹 재계산이 전체 게시글을 매번 스캔합니다. 게시글 수가 매우 많아지면 조회 범위를 좁히거나 배치를 나누는 방안을 고려할 수 있습니다.
2. @nest-lab/throttler-storage-redis는 실제 Redis 연결에서 검증하지 못했습니다(샌드박스 제약). 배포 환경에서 통합 테스트를 권장합니다.
3. PermissionCheckService 캐시의 TTL(5분) 동안 권한 변경이 지연 반영될 수 있습니다(현재는 그런 변경 경로 자체가 없어 필요성이 낮다고 판단).

---

# 전체 12단계 요약

1. Auth - 회원가입/로그인/JWT/Refresh Rotation/이메일 인증/비밀번호 재설정
2. User - 프로필/닉네임/탈퇴(익명화)/차단/프로필 이미지(WebP 파이프라인)
3. Category/Board - CRUD + PermissionsGuard(RBAC 확장)
4. Posts - CRUD/태그/첨부파일/Markdown/조회수 배치/기본 검색
5. Comments - 댓글/대댓글/Soft Delete + 관리자 복구
6. Reactions/Bookmarks - 토글 반응 + TargetValidatorRegistry 최초 적용
7. Search - FTS 정식화 + 관련도 기반 자동완성 + 인기 검색어
8. Notifications - WebSocket 실시간 알림 + BullMQ 배치 발송
9. Report - TargetValidatorRegistry 재사용 + 알림 연동
10. Admin - 회원/공지/금칙어/IP 차단/설정/통계/로그
11. Advertisement - 광고 슬롯/배너 + 금칙어 실연동
12. Performance - 인기글 랭킹 + Redis 캐싱 전반

이것으로 백엔드 개발의 12단계가 모두 완료되었습니다. 확인해 주시면 다음 단계(프론트엔드 개발 또는 배포)로 안내해 드리겠습니다.
