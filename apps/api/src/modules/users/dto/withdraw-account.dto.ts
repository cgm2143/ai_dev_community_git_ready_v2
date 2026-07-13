import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class WithdrawAccountDto {
  @ApiProperty({
    description: '본인 확인을 위한 현재 비밀번호 (소셜 로그인 전용 계정은 비밀번호가 없으므로 생략 가능)',
    required: false,
  })
  @IsOptional()
  @IsString()
  password?: string;
}
