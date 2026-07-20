import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BoardSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;
}

export class CategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional({ nullable: true, description: '메뉴 앞 이모지' })
  icon!: string | null;

  @ApiProperty({ description: '네비게이션 정렬 순서' })
  menuOrder!: number;

  @ApiProperty({ description: 'true면 상단 GNB, false면 더보기(Mega Menu)' })
  isPrimaryMenu!: boolean;

  @ApiProperty({ description: '공개 여부' })
  isActive!: boolean;

  @ApiProperty({ type: [BoardSummaryDto] })
  boards!: BoardSummaryDto[];
}
