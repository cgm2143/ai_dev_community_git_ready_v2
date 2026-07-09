import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['COMMENT', 'REPLY', 'LIKE', 'NOTICE', 'REPORT'] })
  type!: string;

  @ApiPropertyOptional({ nullable: true })
  actorId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  actorNickname!: string | null;

  @ApiPropertyOptional({ nullable: true })
  targetType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  targetId!: string | null;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty({ description: '그룹핑된 알림 개수 (현재는 항상 1, 향후 그룹핑 기능 대비)' })
  groupCount!: number;

  @ApiProperty()
  createdAt!: Date;
}
