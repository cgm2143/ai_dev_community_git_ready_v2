import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MESSAGE = 'slug는 소문자, 숫자, 하이픈만 사용할 수 있습니다.';

export class CreateCategoryDto {
  @ApiProperty({ example: 'AI' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: 'ai', description: '소문자/숫자/하이픈만 허용' })
  @IsString()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  @MaxLength(50)
  slug!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: '🤖', description: '메뉴 앞에 붙는 이모지' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @ApiPropertyOptional({ example: 0, description: '네비게이션 정렬 순서(작을수록 앞)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  menuOrder?: number;

  @ApiPropertyOptional({ example: true, description: 'true면 상단 GNB, false면 더보기(Mega Menu)' })
  @IsOptional()
  @IsBoolean()
  isPrimaryMenu?: boolean;

  @ApiPropertyOptional({ example: true, description: '공개 여부(false면 공개 네비게이션에서 숨김)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'AI' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: 'ai' })
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  @MaxLength(50)
  slug?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: '🤖', description: '메뉴 앞에 붙는 이모지' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @ApiPropertyOptional({ example: 0, description: '네비게이션 정렬 순서(작을수록 앞)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  menuOrder?: number;

  @ApiPropertyOptional({ example: true, description: 'true면 상단 GNB, false면 더보기(Mega Menu)' })
  @IsOptional()
  @IsBoolean()
  isPrimaryMenu?: boolean;

  @ApiPropertyOptional({ example: true, description: '공개 여부(false면 공개 네비게이션에서 숨김)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
