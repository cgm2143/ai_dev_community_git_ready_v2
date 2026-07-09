import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

const AD_TYPES = ['IMAGE', 'HTML', 'SCRIPT', 'ADSENSE'] as const;
const AD_PURPOSES = ['AD', 'EVENT_BANNER'] as const;

export class CreateAdDto {
  @ApiProperty({ example: 'HOME_FEED_1', description: '광고 슬롯 코드' })
  @IsString()
  slotCode!: string;

  @ApiProperty({ enum: AD_TYPES })
  @IsIn(AD_TYPES)
  type!: (typeof AD_TYPES)[number];

  @ApiPropertyOptional({ enum: AD_PURPOSES, default: 'AD' })
  @IsOptional()
  @IsIn(AD_PURPOSES)
  purpose?: (typeof AD_PURPOSES)[number];

  @ApiProperty({ description: '이미지 URL, HTML, 스크립트 코드, AdSense 코드 등 type에 맞는 내용' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: '이미지 배너 클릭 시 이동할 URL' })
  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;
}

export class UpdateAdDto {
  @ApiPropertyOptional({ enum: AD_TYPES })
  @IsOptional()
  @IsIn(AD_TYPES)
  type?: (typeof AD_TYPES)[number];

  @ApiPropertyOptional({ enum: AD_PURPOSES })
  @IsOptional()
  @IsIn(AD_PURPOSES)
  purpose?: (typeof AD_PURPOSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;
}
