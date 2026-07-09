import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export class QueryAdminUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

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

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number];
}

export class UpdateUserRoleDto {
  @ApiPropertyOptional({ example: 'MODERATOR' })
  @IsString()
  roleName!: string;
}
