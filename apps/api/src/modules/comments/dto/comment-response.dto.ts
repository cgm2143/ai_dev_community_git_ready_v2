import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  postId!: string;

  @ApiPropertyOptional({ nullable: true })
  parentId!: string | null;

  @ApiProperty()
  authorId!: string;

  @ApiProperty()
  authorNickname!: string;

  @ApiPropertyOptional({ nullable: true })
  authorProfileImageUrl!: string | null;

  @ApiProperty({ description: '삭제된 댓글은 "삭제된 댓글입니다"로 대체되어 내려온다' })
  content!: string;

  @ApiProperty()
  isDeleted!: boolean;

  @ApiProperty()
  likeCount!: number;

  @ApiProperty({ description: '직접 딸린 대댓글 수 (삭제된 것 포함 - 스레드 자리 유지)' })
  replyCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
