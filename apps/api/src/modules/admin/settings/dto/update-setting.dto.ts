import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({ description: 'JSON 값 (문자열, 숫자, 불리언, 객체 모두 가능)' })
  @IsDefined()
  value!: unknown;
}
