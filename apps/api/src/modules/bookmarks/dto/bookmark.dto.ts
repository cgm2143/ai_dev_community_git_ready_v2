import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryBookmarkDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class BookmarkedPostResponseDto {
  @ApiProperty()
  postId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  excerpt!: string;

  @ApiProperty()
  boardName!: string;

  @ApiProperty()
  boardSlug!: string;

  @ApiProperty()
  authorNickname!: string;

  @ApiPropertyOptional({ nullable: true })
  authorProfileImageUrl!: string | null;

  @ApiProperty()
  viewCount!: number;

  @ApiProperty()
  likeCount!: number;

  @ApiProperty()
  commentCount!: number;

  @ApiProperty()
  bookmarkedAt!: Date;

  @ApiProperty()
  createdAt!: Date;
}
