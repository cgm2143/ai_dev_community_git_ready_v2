import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PostAttachmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileUrl!: string;

  @ApiProperty()
  fileType!: string;
}

export class PostListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  boardId!: string;

  @ApiProperty()
  boardName!: string;

  @ApiProperty()
  boardSlug!: string;

  @ApiProperty()
  authorId!: string;

  @ApiProperty()
  authorNickname!: string;

  @ApiPropertyOptional({ nullable: true })
  authorProfileImageUrl!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ description: '본문 미리보기 (HTML 태그 제거, 최대 150자)' })
  excerpt!: string;

  @ApiProperty()
  viewCount!: number;

  @ApiProperty()
  likeCount!: number;

  @ApiProperty()
  dislikeCount!: number;

  @ApiProperty()
  commentCount!: number;

  @ApiProperty()
  isNotice!: boolean;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  createdAt!: Date;
}

export class PostDetailDto extends PostListItemDto {
  @ApiProperty({ description: 'Markdown 원문' })
  content!: string;

  @ApiProperty({ description: '렌더링된 HTML (캐시됨)' })
  contentHtml!: string;

  @ApiProperty({ type: [PostAttachmentDto] })
  attachments!: PostAttachmentDto[];

  @ApiProperty()
  updatedAt!: Date;
}
