import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { PostSearchSort } from '../domain/search-repository.interface';

const SEARCH_SORTS: PostSearchSort[] = ['relevance', 'latest', 'views', 'likes'];

export class SearchQueryDto {
  @ApiProperty({ example: 'nestjs' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q!: string;

  @ApiPropertyOptional({ description: '카테고리 필터(카테고리 ID)' })
  @IsOptional()
  @IsUUID('all')
  categoryId?: string;

  @ApiPropertyOptional({ description: '게시판 필터(게시판 ID)' })
  @IsOptional()
  @IsUUID('all')
  boardId?: string;

  @ApiPropertyOptional({ description: '태그 필터(태그명, 단일)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  tag?: string;

  @ApiPropertyOptional({
    enum: SEARCH_SORTS,
    default: 'relevance',
    description: 'relevance(관련도, 기본) | latest(최신) | views(조회) | likes(추천)',
  })
  @IsOptional()
  @IsIn(SEARCH_SORTS)
  sort?: PostSearchSort;

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

export class AutocompleteQueryDto {
  @ApiProperty({ example: 'nest' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  q!: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}
