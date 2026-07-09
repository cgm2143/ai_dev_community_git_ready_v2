import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ReactDto {
  @ApiProperty({ enum: ['LIKE', 'DISLIKE'] })
  @IsIn(['LIKE', 'DISLIKE'])
  type!: 'LIKE' | 'DISLIKE';
}

export class ReactionResultDto {
  @ApiProperty({ description: '토글 후 현재 사용자의 반응이 활성 상태인지' })
  active!: boolean;

  @ApiProperty({ enum: ['LIKE', 'DISLIKE'], nullable: true })
  type!: 'LIKE' | 'DISLIKE' | null;

  @ApiProperty()
  likeCount!: number;

  @ApiProperty({ nullable: true, description: '댓글 대상인 경우 비추천이 없어 null' })
  dislikeCount!: number | null;
}
