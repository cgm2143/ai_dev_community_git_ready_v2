import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class SendVerificationEmailDto {
  @ApiProperty({ example: 'dev@example.com' })
  @IsEmail()
  email!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: '인증 메일의 링크에 포함된 토큰' })
  @IsString()
  token!: string;
}
