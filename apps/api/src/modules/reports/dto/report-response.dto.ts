import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  reporterId!: string;

  @ApiProperty()
  reporterNickname!: string;

  @ApiProperty({ enum: ['POST', 'COMMENT', 'USER'] })
  targetType!: string;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: ['SPAM', 'ABUSE', 'ILLEGAL', 'ETC'] })
  reason!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ['PENDING', 'RESOLVED', 'REJECTED'] })
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  resolvedBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  resolvedAt!: Date | null;
}
