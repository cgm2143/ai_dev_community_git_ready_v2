import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'dev@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'P@ssw0rd!23', description: '영문/숫자/특수문자를 포함한 8자 이상' })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt는 72바이트를 초과하는 부분을 무시하므로 상한을 명시적으로 둔다
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.',
  })
  password!: string;

  @ApiProperty({ example: '코딩왕' })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  nickname!: string;
}
