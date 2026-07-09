import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 프로필 이미지는 presigned URL 직접 업로드 대신, 서버가 파일을 받아
 * (검증 -> WebP 변환/리사이즈/썸네일 생성/EXIF 제거 -> S3 업로드) 처리하는 방식으로 구현한다.
 * 따라서 별도의 요청 바디 DTO는 없고(멀티파트 파일 필드만 사용), 응답 DTO만 정의한다.
 */
export class ProfileImageResponseDto {
  @ApiProperty({ description: '1024x1024 이하로 리사이즈된 WebP 원본 URL' })
  profileImageUrl!: string;

  @ApiPropertyOptional({ nullable: true, description: '256x256 WebP 썸네일 URL' })
  profileThumbnailUrl!: string | null;
}
