import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

export type ImageFit = 'inside' | 'cover' | 'contain' | 'fill' | 'outside';

export interface WebpConversionOptions {
  width: number;
  height: number;
  fit?: ImageFit;
  /** 원본이 지정 크기보다 작을 때 확대할지 여부. 기본 false(확대 허용) */
  withoutEnlargement?: boolean;
  quality?: number;
}

/**
 * 공통 이미지 처리 서비스. 특정 도메인(프로필 이미지 등)에 종속되지 않고
 * "리사이즈 + WebP 변환"이라는 범용 연산만 제공한다. 치수·품질 등 정책 값은
 * 호출부(UsersService, 향후 Posts 이미지 첨부 등)가 자신의 도메인 규칙에 맞게 넘긴다.
 *
 * - `.rotate()`(인자 없음): 입력의 EXIF Orientation을 픽셀에 반영한 뒤 처리하므로,
 *   결과물에는 방향이 이미 올바르게 적용되어 있다.
 * - `.webp()`로 인코딩할 때 `.withMetadata()`를 호출하지 않으므로, EXIF/GPS 등
 *   원본 메타데이터는 결과물에 전혀 남지 않는다 (의도적인 개인정보 제거).
 */
@Injectable()
export class ImageService {
  async toWebp(input: Buffer, options: WebpConversionOptions): Promise<Buffer> {
    return sharp(input)
      .rotate()
      .resize({
        width: options.width,
        height: options.height,
        fit: options.fit ?? 'inside',
        withoutEnlargement: options.withoutEnlargement ?? false,
        position: 'centre',
      })
      .webp({ quality: options.quality ?? 85 })
      .toBuffer();
  }
}
