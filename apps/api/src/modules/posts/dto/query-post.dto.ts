import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export type PostSort = 'latest' | 'popular';

export class QueryPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all')
  boardId?: string;

  @ApiPropertyOptional({ description: '태그명으로 필터링 (단일)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  tag?: string;

  @ApiPropertyOptional({ description: '여러 태그 중 하나라도 포함(OR). 콤마로 구분. Feature Hub용.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tags?: string;

  @ApiPropertyOptional({ description: '카테고리 slug로 필터링 (해당 카테고리 게시판들의 글)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ description: '제목/본문 키워드 검색 (PostgreSQL Full Text Search)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ enum: ['latest', 'popular'], default: 'latest' })
  @IsOptional()
  @IsIn(['latest', 'popular'])
  sort?: PostSort;

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
