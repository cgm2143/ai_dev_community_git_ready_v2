import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlockedUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nickname!: string;

  @ApiPropertyOptional({ nullable: true })
  profileImageUrl!: string | null;

  @ApiProperty()
  blockedAt!: Date;
}
