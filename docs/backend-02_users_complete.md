# AI 개발자 커뮤니티 — Backend 2단계: User 모듈 완료

프로필 조회/수정, 닉네임 변경, 비밀번호 변경, 프로필 이미지 업로드, 회원 탈퇴(익명화)를 구현했습니다. 이미지 업로드를 위해 S3 호환 스토리지 인프라(Presigned URL)를 공용 모듈로 먼저 구축했고, 로컬 개발 편의를 위해 `docker-compose.yml`에 MinIO를 추가했습니다.

---

## 1. 신규 인프라 — Storage (S3 호환, Presigned URL)

`src/infra/storage`
- `StorageService.createPresignedUploadUrl(key, contentType)`: 5분간 유효한 업로드 전용 presigned URL 발급. **파일 자체는 백엔드를 거치지 않고 클라이언트가 S3/MinIO에 직접 업로드**(1단계 아키텍처 방침)
- `buildPublicUrl` / `extractKeyFromPublicUrl`: key ↔ 공개 URL 상호 변환
- `deleteObject`: 프로필 이미지 교체 시 이전 파일 정리
- 이 모듈은 그대로 재사용되어 향후 4단계(Posts)의 첨부파일 업로드에도 동일하게 쓰입니다.

## 2. User 모듈 엔드포인트

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/v1/users/me` | 내 프로필 조회 |
| PATCH | `/v1/users/me` | 닉네임/소개글 수정 |
| PATCH | `/v1/users/me/password` | 비밀번호 변경 |
| POST | `/v1/users/me/profile-image` | 프로필 이미지 업로드용 Presigned URL 발급 |
| PATCH | `/v1/users/me/profile-image` | 업로드 완료 후 key를 프로필 이미지로 확정 |
| DELETE | `/v1/users/me` | 회원 탈퇴 (비밀번호 확인 필요) |
| GET | `/v1/users/:nickname` | 공개 프로필 조회 |

## 3. 핵심 설계 포인트

- **비밀번호 변경/회원 탈퇴 모두 현재 비밀번호 재확인 필요**: 탈취된 Access Token만으로는 이 두 가지 민감한 작업을 수행할 수 없도록 함
- **비밀번호 변경 성공 시 다른 모든 세션 로그아웃**: Auth 단계의 "비밀번호 재설정 시 전체 세션 폐기" 정책과 동일한 원칙을 세션 내 변경에도 적용
- **프로필 이미지 key 네임스페이스 검증**: `avatars/{userId}/...` 형식만 허용해, 다른 사용자가 발급받은 presigned URL의 key를 도용해 자신의 프로필 이미지로 등록하는 것을 차단
- **회원 탈퇴 = 완전한 익명화** (6단계 DB 설계 확정 정책 그대로 구현):
  - `email` → `deleted-{userId}@anonymized.local`, `nickname` → `삭제된 회원-{8자리}` (UNIQUE 제약 유지)
  - `passwordHash`/`emailVerifiedAt`/`lastLoginAt` → `null`
  - `refresh_tokens` → 물리 삭제
  - `posts`/`comments` → 그대로 유지 (4단계 이후 프론트에서 작성자명을 "삭제된 회원"으로 렌더링)
- **공개 프로필에서 탈퇴 계정은 일반 404와 동일하게 처리**: `status = WITHDRAWN`인 사용자를 조회하면 존재하지 않는 것처럼 응답해, 탈퇴 여부 자체가 제3자에게 노출되지 않도록 함

## 4. docker-compose 변경

- `minio` 서비스 추가 (S3 API `:9000`, 콘솔 `:9001`), `api` 서비스가 이를 바라보도록 `S3_*` 환경변수 연결
- **주의**: MinIO는 최초 기동 시 버킷을 자동 생성하지 않습니다. 로컬 개발 시 콘솔(`http://localhost:9001`)에서 `ai-dev-community` 버킷을 한 번 생성하거나, `mc mb` 명령을 실행하는 초기화 스크립트를 추가해야 합니다 (10단계 배포에서 운영용 버킷 프로비저닝과 함께 자동화하는 것을 제안드립니다).

---

## 5. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 3건 (모두 Prisma 엔진 미생성, 코드 결함 아님)
파일 수(.ts)      → 58개
```

---

## 6. 코드 리뷰 — 확인이 필요한 사항

1. **차단(Block) 기능 미포함**: 원본 기획서에는 "차단 기능"이 회원 기능에 포함되어 있고, DB 스키마에도 `user_blocks` 테이블이 이미 있습니다. 이번 지시사항(프로필 조회/수정, 닉네임 변경, 회원 탈퇴)에는 명시되지 않아 이번 단계에서는 제외했습니다. User 단계에 포함할지, 이후 별도로 처리할지 확인 부탁드립니다.
2. **탈퇴 후 재가입 시 이메일 충돌 가능성**: 탈퇴 계정의 email이 `deleted-{userId}@anonymized.local`로 바뀌므로, 동일한 원래 이메일로 재가입하는 것은 문제없이 가능합니다 (의도된 동작입니다 — 확인 차 명시합니다).
3. **MinIO 버킷 자동 생성 스크립트 부재**: 위 4번 항목 참고. 로컬 개발 시 수동 생성이 필요합니다.
4. **프로필 이미지 파일 크기 제한 없음**: 현재 presigned URL 발급 시 `Content-Type`만 검증하고 있습니다. 파일 크기 제한(예: 5MB)은 S3 정책(Presigned POST의 Content-Length-Range) 또는 클라이언트 검증에 의존하는 상태입니다. 4단계(Posts) 첨부파일 구현 시 함께 정책화하는 것을 제안드립니다.

---

이 상태로 확인해 주시면 **3단계: Category / Board**로 진행하겠습니다.
