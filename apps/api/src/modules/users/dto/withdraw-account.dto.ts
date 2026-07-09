import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class WithdrawAccountDto {
  @ApiProperty({ description: '본인 확인을 위한 현재 비밀번호' })
  @IsString()
  password!: string;
}
