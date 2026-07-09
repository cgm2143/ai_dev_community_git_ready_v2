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

  @ApiProperty({ type: [BoardSummaryDto] })
  boards!: BoardSummaryDto[];
}
