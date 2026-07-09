import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService } from '../../../infra/storage/storage.service';

export interface ProfileImageKeys {
  fileId: string;
  mainKey: string;
  thumbnailKey: string;
}

/**
 * 프로필 이미지의 "키/URL 명명 규칙"을 이 서비스 하나에만 캡슐화한다.
 * 원본과 썸네일은 DB에 각각의 URL을 저장하지 않고(User.profileImageUrl 하나만 저장),
 * `{uuid}.webp` / `{uuid}-thumb.webp`라는 명명 규칙으로 썸네일 URL을 계산해서 응답한다.
 *
 * 이렇게 분리해 둔 이유: 향후 스토리지를 교체하거나(S3 -> CDN 프록시 등),
 * 명명 규칙 자체를 바꿔야 할 때(예: 썸네일을 별도 접두사 폴더로 옮기는 경우)
 * UsersService나 컨트롤러를 전혀 건드리지 않고 이 서비스만 수정하면 되도록 하기 위함이다.
 */
@Injectable()
export class ProfileImageUrlService {
  constructor(private readonly storageService: StorageService) {}

  generateKeys(userId: string): ProfileImageKeys {
    const fileId = randomUUID();
    return {
      fileId,
      mainKey: this.buildMainKey(userId, fileId),
      thumbnailKey: this.buildThumbnailKey(userId, fileId),
    };
  }

  buildMainKey(userId: string, fileId: string): string {
    return `avatars/${userId}/${fileId}.webp`;
  }

  buildThumbnailKey(userId: string, fileId: string): string {
    return `avatars/${userId}/${fileId}-thumb.webp`;
  }

  /** 원본 key로부터 대응하는 썸네일 key를 계산한다 (정리/삭제 시 사용). */
  resolveThumbnailKeyFromMainKey(mainKey: string): string {
    return mainKey.replace(/\.webp$/, '-thumb.webp');
  }

  /** 원본 공개 URL로부터 대응하는 썸네일 공개 URL을 계산한다 (응답 조립 시 사용). */
  resolveThumbnailUrlFromMainUrl(mainPublicUrl: string): string {
    return mainPublicUrl.replace(/\.webp$/, '-thumb.webp');
  }

  buildPublicUrl(key: string): string {
    return this.storageService.buildPublicUrl(key);
  }
}
