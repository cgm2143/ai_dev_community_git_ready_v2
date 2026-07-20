import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SuggestTagsDto {
  @ApiProperty({ description: '게시글 제목' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: '게시글 본문(Markdown 원문)' })
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  content!: string;
}
