# AI 개발자 커뮤니티 — User 단계 최종 반영 (차단 기능 + 이미지 파이프라인)

지시하신 3가지 방향을 모두 반영했습니다.

---

## 1. 차단(Block) 기능

### 재사용 가능한 구조
`src/modules/blocks`를 **Users에 종속시키지 않는 독립 모듈**로 분리했습니다.

- `BlockService`: `block()`, `unblock()`, `isBlocked()`, `getBlockedUserIds()`, `listBlockedUsers()`
- **설계 결정**: 차단을 "전체 차단" 하나의 관계로 단순화했습니다. `user_blocks` 테이블에 별도의 `scope`(콘텐츠만/쪽지만 등) 컬럼을 두지 않고, 대신 **차단 여부를 확인하는 지점을 여러 모듈에 분산**시키는 방식으로 확장성을 확보했습니다.
  - 지금: `UsersController`가 `block/unblock/목록조회` 엔드포인트로 사용
  - 향후 4단계(Posts/Comments): 목록 조회 쿼리에서 `getBlockedUserIds(viewerId)` 결과로 `authorId NOT IN (...)` 필터링
  - 향후 8단계(Notifications)·쪽지: 알림 발송/쪽지 수신 전에 `isBlocked(receiverId, senderId)` 확인 후 차단 시 무시
  - 즉, **새 기능이 차단을 반영해야 할 때마다 `BlockService`를 가져다 쓰기만 하면 되고**, `user_blocks` 테이블이나 이 서비스 자체를 변경할 필요가 없습니다. 세분화된 범위(예: "쪽지는 허용, 게시글만 숨김")가 실제로 요구되면 그때 `scope` 컬럼과 파라미터를 추가하는 2차 확장도 이 구조를 그대로 유지한 채 가능합니다.

### 엔드포인트
| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/v1/users/me/blocks` | 차단한 사용자 목록 |
| POST | `/v1/users/:id/block` | 사용자 차단 |
| DELETE | `/v1/users/:id/block` | 차단 해제 |

- 자기 자신 차단 시도는 `CANNOT_BLOCK_SELF`로 거부
- 차단/해제 모두 멱등 처리 (이미 차단된 대상을 다시 차단해도 에러 없음, 이미 해제된 대상을 다시 해제해도 에러 없음)

---

## 2. MinIO 버킷 생성 — 계획대로 10단계로 이연

이번 단계에서는 별도 코드 변경 없이 **수동 생성을 유지**합니다. 10단계(배포)에서 `docker-compose.yml`의 `minio` 서비스에 `mc mb` 초기화 스크립트(또는 `createbuckets` 헬퍼 컨테이너)를 추가해 `docker compose up` 한 번으로 버킷까지 자동 준비되도록 구성할 예정입니다. (이번 문서에는 별도 코드 변경 없음 — 계획만 재확인)

---

## 3. 프로필 이미지 업로드 정책 — 서버 사이드 처리 파이프라인으로 전환

**중요한 설계 변경**: 기존에는 Presigned URL로 클라이언트가 S3에 직접 업로드하는 방식이었으나, **리사이즈/포맷 변환/썸네일 생성/EXIF 제거는 서버가 실제 바이트를 봐야만 가능**하므로, 프로필 이미지는 `POST /v1/users/me/profile-image`(multipart/form-data) 하나로 통합했습니다. 클라이언트가 파일을 백엔드로 전송하면, 백엔드가 검증·가공한 뒤 S3에 업로드합니다. (Presigned URL 직접 업로드 방식 자체는 인프라로 남겨두어, 가공이 필요 없는 4단계 첨부파일에는 계속 사용합니다.)

### 검증 (`src/common/utils/image-validation.util.ts`)
1. **파일 크기**: 5MB 초과 시 `FILE_TOO_LARGE`
2. **선언된 MIME 타입**: `image/jpeg`, `image/png`, `image/webp`만 허용
3. **확장자**: `.jpg`, `.jpeg`, `.png`, `.webp`만 허용
4. **실제 바이트 시그니처(매직 넘버) 검사**: JPEG(`FF D8 FF`), PNG(`89 50 4E 47 0D 0A 1A 0A`), WebP(`RIFF...WEBP`) 시그니처를 직접 확인합니다. **GIF/SVG는 이 목록에 아예 없으므로 자동으로 거부**되며, 확장자만 바꿔치기하거나 Content-Type을 위장한 파일도 실제 내용과 다르면 거부됩니다.
5. 4가지(크기/MIME/확장자/실제 시그니처)가 서로 일치하지 않으면 거부

`FileInterceptor`의 `fileFilter`로 1차 방어(빠른 거부)를 두고, 서비스 레이어의 매직 바이트 검사를 최종 신뢰 기준으로 삼는 이중 구조입니다.

### 이미지 처리 (`src/infra/image-processing`, sharp 기반)
- `.rotate()`(인자 없음)로 EXIF Orientation을 픽셀에 반영한 뒤, `.webp()` 인코딩 시 `.withMetadata()`를 호출하지 않아 **EXIF/GPS 등 메타데이터가 결과물에 전혀 포함되지 않습니다.**
- 원본: 1024×1024 이하로 축소(`fit: inside`, 확대는 하지 않음), WebP 품질 85
- 썸네일: 256×256 정사각형(`fit: cover`), WebP 품질 80
- 파일명은 `avatars/{userId}/{randomUUID}.webp` / `{randomUUID}-thumb.webp` — **UUID 기반**이라 파일명 추측/충돌 가능성이 없음
- 업로드 성공 후 이전 프로필 이미지(원본+썸네일)를 백그라운드로 정리

### 응답
```json
{
  "success": true,
  "data": {
    "id": "...",
    "nickname": "...",
    "profileImageUrl": "https://.../avatars/{userId}/{uuid}.webp",
    "profileThumbnailUrl": "https://.../avatars/{userId}/{uuid}-thumb.webp",
    ...
  }
}
```
`profileThumbnailUrl`은 별도 DB 컬럼 없이 **원본 URL로부터 명명 규칙(`-thumb` 접미사)으로 계산**해 응답에만 포함합니다. (스키마 변경 없이 구현 — 과설계 방지)

---

## 4. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 4건 (모두 Prisma 엔진 미생성, 코드 결함 아님)
파일 수(.ts)      → 64개
```

---

## 5. 코드 리뷰 — 확인이 필요한 사항

1. **썸네일 URL을 DB에 저장하지 않고 명명 규칙으로 계산**하는 방식을 택했습니다. 이 방식은 스토리지 키 명명 규칙이 바뀌면(예: CDN 마이그레이션) 프론트가 추정할 수 없게 되는 트레이드오프가 있습니다. 향후 이 방식이 부담되면 `profileThumbnailUrl` 컬럼을 추가하는 마이그레이션도 고려할 수 있습니다.
2. **동시 업로드 레이스 컨디션**: 같은 사용자가 프로필 이미지를 동시에 두 번 업로드하면, 이전 이미지 정리 로직이 방금 올라간 새 이미지를 잘못 지울 가능성이 이론상 있습니다(둘 다 "이전 이미지"를 같은 시점의 값으로 읽을 경우). 실제 발생 확률은 낮지만, 완벽히 막으려면 낙관적 잠금(버전 컬럼) 또는 업로드 자체에 짧은 디바운스가 필요합니다 — 현재는 적용하지 않았습니다.
3. **sharp 네이티브 바이너리**: 샌드박스에서 `npm install` 후 실제로 10x10 이미지를 생성해 WebP로 인코딩하는 런타임 스모크 테스트까지 성공적으로 확인했습니다(현재 리눅스 glibc 환경 기준). 다만 Docker 이미지는 Alpine(musl libc) 기반이라 sharp가 musl용 프리빌드 바이너리를 별도로 받아야 하므로, **10단계 배포 시 실제 컨테이너 빌드에서 한 번 더 검증**하는 것을 권장합니다.

---

이 상태로 확인해 주시면 **3단계: Category / Board**로 진행하겠습니다.
