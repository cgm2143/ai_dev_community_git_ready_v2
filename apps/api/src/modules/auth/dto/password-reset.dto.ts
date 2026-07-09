import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'dev@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '비밀번호 재설정 메일의 링크에 포함된 토큰' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'NewP@ssw0rd!23' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.',
  })
  newPassword!: string;
}
