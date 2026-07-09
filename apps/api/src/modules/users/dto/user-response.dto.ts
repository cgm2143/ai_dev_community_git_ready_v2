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

  @ApiProperty()
  createdAt!: Date;
}

export class PublicProfileResponseDto {
  @ApiProperty()
  nickname!: string;

  @ApiPropertyOptional({ nullable: true })
  bio!: string | null;

  @ApiPropertyOptional({ nullable: true })
  profileImageUrl!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
