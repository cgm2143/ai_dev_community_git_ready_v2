import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  nickname!: string;

  @ApiProperty()
  role!: string;
}

export class AccessTokenResponseDto {
  @ApiProperty({ description: 'API 요청 시 Authorization: Bearer 헤더에 사용' })
  accessToken!: string;

  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto;
}
