import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const TARGET_TYPES = ['POST', 'COMMENT', 'USER'] as const;
const REASONS = ['SPAM', 'ABUSE', 'ILLEGAL', 'ETC'] as const;

export class CreateReportDto {
  @ApiProperty({ enum: TARGET_TYPES })
  @IsIn(TARGET_TYPES)
  targetType!: (typeof TARGET_TYPES)[number];

  @ApiProperty()
  @IsUUID('all')
  targetId!: string;

  @ApiProperty({ enum: REASONS })
  @IsIn(REASONS)
  reason!: (typeof REASONS)[number];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ResolveReportDto {
  @ApiProperty({ enum: ['RESOLVED', 'REJECTED'] })
  @IsIn(['RESOLVED', 'REJECTED'])
  status!: 'RESOLVED' | 'REJECTED';
}
