import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MyProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  nickname!: string;

  @ApiPropertyOptional({ nullable: true })
  bio!: string | null;

  @ApiPropertyOptional({ nullable: true })
  profileImageUrl!: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({
    description: '비밀번호가 설정된 계정인지 여부. 소셜 로그인 전용 계정은 false이며, 이 경우 회원 탈퇴 시 비밀번호 확인을 요구하지 않는다.',
  })
  hasPassword!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class PublicProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nickname!: string;

  @ApiPropertyOptional({ nullable: true })
  bio!: string | null;

  @ApiPropertyOptional({ nullable: true })
  profileImageUrl!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
