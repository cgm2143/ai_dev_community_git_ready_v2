import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { StorageService } from '../../../infra/storage/storage.service';
import { ProfileImageUrlService } from './profile-image-url.service';

/**
 * 프로필 이미지 교체 시 "이전 파일 정리"만 전담하는 서비스.
 *
 * 현재 구현: 업로드 성공 직후 비동기(fire-and-forget)로 즉시 삭제한다.
 * 이론적으로 동시 업로드가 겹치면 방금 올라간 새 이미지를 잘못 정리할 여지가 있지만
 * (현재 단계에서는 의도적으로 대응하지 않기로 함), 이 서비스로 정리 로직을 감싸 두었기 때문에
 * 다음 두 방향으로 나중에 손쉽게 교체할 수 있다:
 *   1) BullMQ 지연 작업(delay job)으로 전환 - N분 뒤 "현재 프로필 이미지 URL과 다를 때만" 삭제
 *   2) DB 트랜잭션과 결합 - User.profileImageUrl 갱신과 같은 트랜잭션에서 조건부로 정리 대상 확정
 * 호출부(UsersService)는 scheduleCleanup() 시그니처만 알면 되고, 내부 구현 교체에 영향받지 않는다.
 */
@Injectable()
export class ProfileImageCleanupService {
  constructor(
    private readonly storageService: StorageService,
    private readonly profileImageUrlService: ProfileImageUrlService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ProfileImageCleanupService.name);
  }

  scheduleCleanup(userId: string, previousMainUrl: string | null): void {
    if (!previousMainUrl) return;

    const previousKey = this.storageService.extractKeyFromPublicUrl(previousMainUrl);
    if (!previousKey) return;

    const previousThumbnailKey = this.profileImageUrlService.resolveThumbnailKeyFromMainKey(previousKey);

    Promise.all([
      this.storageService.deleteObject(previousKey),
      this.storageService.deleteObject(previousThumbnailKey),
    ]).catch((error) => {
      this.logger.warn({ err: error, userId, previousKey }, '이전 프로필 이미지 삭제에 실패했습니다.');
    });
  }
}
