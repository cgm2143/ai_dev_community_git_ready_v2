import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

/** 동영상은 초기 버전에서 지원하지 않는다 - 목록에 video/* 계열을 의도적으로 포함하지 않았다. */
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/zip',
  'text/plain',
] as const;

const IMAGE_CONTENT_TYPES = new Set<string>(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 일반 파일: 최대 20MB
export const MAX_ATTACHMENT_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 이미지: 최대 10MB
export const MAX_ATTACHMENTS_PER_POST = 10;

export function isImageContentType(contentType: string): boolean {
  return IMAGE_CONTENT_TYPES.has(contentType);
}

/** contentType에 따라 이미지(10MB)/일반 파일(20MB) 중 적용할 최대 크기를 반환한다. */
export function maxSizeForContentType(contentType: string): number {
  return isImageContentType(contentType) ? MAX_ATTACHMENT_IMAGE_SIZE_BYTES : MAX_ATTACHMENT_FILE_SIZE_BYTES;
}

export class RequestAttachmentUploadDto {
  @ApiProperty({ example: 'diagram.png' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ enum: ALLOWED_CONTENT_TYPES })
  @IsString()
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType!: (typeof ALLOWED_CONTENT_TYPES)[number];

  @ApiProperty({
    example: 102400,
    description: '바이트 단위 파일 크기. 이미지는 최대 10MB, 그 외 파일은 최대 20MB (서비스 레이어에서 카테고리별로 검증)',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_ATTACHMENT_FILE_SIZE_BYTES)
  fileSize!: number;
}

export class ConfirmAttachmentDto {
  @ApiProperty({ description: 'presigned URL 발급 시 받은 key' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'diagram.png' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ enum: ALLOWED_CONTENT_TYPES })
  @IsString()
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType!: (typeof ALLOWED_CONTENT_TYPES)[number];

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(MAX_ATTACHMENT_FILE_SIZE_BYTES)
  fileSize!: number;
}

export class AttachmentIdDto {
  @ApiProperty()
  @IsUUID('all')
  id!: string;
}
