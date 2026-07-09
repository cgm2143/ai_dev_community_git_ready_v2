# AI 개발자 커뮤니티 — User 단계 리팩터링 완료 (URL 추상화 / 확장 가능한 정리 구조 / 공통 ImageService)

지시하신 3가지 방향과 추가 요청(공통 `ImageService` 분리)을 모두 반영했습니다.

---

## 1. URL 생성 로직 분리 — `ProfileImageUrlService`

`src/modules/users/services/profile-image-url.service.ts`
- `generateKeys(userId)`: 신규 업로드 시 `{fileId, mainKey, thumbnailKey}` 생성
- `resolveThumbnailKeyFromMainKey(mainKey)` / `resolveThumbnailUrlFromMainUrl(mainUrl)`: 명명 규칙(`-thumb` 접미사) 계산
- **효과**: 스토리지 교체(S3 → CDN 등)나 명명 규칙 변경 시 이 서비스 하나만 수정하면 됩니다. `UsersService`, 컨트롤러, `ProfileImageCleanupService` 어디에도 명명 규칙이 하드코딩되어 있지 않습니다.

## 2. 정리(cleanup) 로직 분리 — `ProfileImageCleanupService`

`src/modules/users/services/profile-image-cleanup.service.ts`
- `scheduleCleanup(userId, previousMainUrl)` 하나의 시그니처로 "이전 이미지 정리"를 캡슐화
- 현재 구현은 그대로(즉시 비동기 삭제, 레이스 컨디션 미대응)이지만, 이 서비스 뒤로 로직을 감춰 두었기 때문에 향후 두 방향으로 손쉽게 교체 가능합니다:
  1. BullMQ 지연 작업으로 전환 (N분 뒤 "현재 URL과 다를 때만" 삭제)
  2. DB 트랜잭션과 결합해 정리 대상을 원자적으로 확정
- `UsersService`는 이 서비스의 시그니처만 알면 되므로, 내부 구현이 바뀌어도 호출부는 변경되지 않습니다.

## 3. sharp Alpine 호환성 — 10단계에서 재검증 예정 (계획만 재확인, 코드 변경 없음)

이번 단계에서 별도 조치는 하지 않았으며, 10단계(배포) 착수 시 실제 Docker(Alpine/musl) 컨테이너 빌드로 이미지 업로드 → WebP 변환 → 썸네일 생성 전체 플로우를 다시 검증하겠습니다.

참고로 이번 리팩터링 과정에서 샌드박스(glibc) 환경 기준으로는 **2000×1500 원본 → 1024×768 축소 + 256×256 썸네일 크롭까지 실제로 정상 동작**하는 것을 다시 한번 확인했습니다.

---

## 추가: 공통 `ImageService` 분리

`src/infra/image-processing` → `src/infra/image`로 이동하고, `ImageProcessingService.processProfileImage()`라는 프로필 전용 메서드 대신 **범용 `ImageService.toWebp(buffer, options)`** 하나로 일반화했습니다.

```ts
await imageService.toWebp(buffer, {
  width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true, quality: 85,
});
```

- 치수·품질·크롭 방식(`fit`) 등 **정책 값은 호출부가 결정**합니다. `UsersService`는 프로필 이미지용 상수(1024/256, quality 85/80)를 자신의 파일에 두고, 이 서비스에는 도메인 지식이 전혀 없습니다.
- 이 구조 덕분에 향후 4단계(Posts) 이미지 첨부, 배너 이미지 등 **치수가 다른 이미지 처리 요구가 생겨도 `ImageService`를 그대로 재사용**할 수 있습니다 (해상도 제한, 다중 이미지 등 정책만 호출부에서 다르게 넘기면 됨).

---

## 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 4건 (모두 Prisma 엔진 미생성, 코드 결함 아님)
파일 수(.ts)      → 66개
런타임 스모크 테스트 → 통과 (리사이즈 + WebP 변환 + 썸네일 크롭 모두 정상)
```

---

이 상태로 확인해 주시면 **3단계: Category / Board**로 진행하겠습니다.
