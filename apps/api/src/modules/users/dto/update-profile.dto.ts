import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '코딩왕' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  nickname?: string;

  @ApiPropertyOptional({ example: 'NestJS와 Next.js를 좋아하는 개발자입니다.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;
}
