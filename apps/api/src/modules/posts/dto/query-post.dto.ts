import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export type PostSort = 'latest' | 'popular';

export class QueryPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all')
  boardId?: string;

  @ApiPropertyOptional({ description: '태그명으로 필터링' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  tag?: string;

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
