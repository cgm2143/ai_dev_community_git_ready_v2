import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIP, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIpBanDto {
  @ApiProperty({ example: '203.0.113.10' })
  @IsIP()
  ipAddress!: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional({ description: '지정하지 않으면 무기한 차단' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
