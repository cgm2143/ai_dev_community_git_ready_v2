import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetNoticeDto {
  @ApiProperty()
  @IsBoolean()
  isNotice!: boolean;
}
