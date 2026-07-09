import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty()
  @IsUUID('all')
  boardId!: string;

  @ApiProperty({ example: 'NestJS Clean Architecture 적용기' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: 'Markdown 원문', example: '## 배경\n...' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ type: [String], example: ['nestjs', 'clean-architecture'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String], description: '사전에 업로드된 첨부파일 id 목록' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  attachmentIds?: string[];
}
