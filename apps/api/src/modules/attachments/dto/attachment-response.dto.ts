import { ApiProperty } from '@nestjs/swagger';

export class AttachmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileUrl!: string;

  @ApiProperty()
  fileType!: string;

  @ApiProperty()
  fileSize!: number;
}

export class PresignedUploadResponseDto {
  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty()
  publicUrl!: string;

  @ApiProperty()
  key!: string;
}
