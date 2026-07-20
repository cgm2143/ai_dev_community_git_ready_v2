import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export type RankingType = 'hot' | 'views' | 'comments' | 'likes';
export const RANKING_TYPES: RankingType[] = ['hot', 'views', 'comments', 'likes'];

/**
 * 범용 랭킹 조회 파라미터. 향후 type을 확장(예: trending, controversial 등)해도
 * 프론트/엔드포인트 시그니처를 유지할 수 있도록 설계했다.
 * - type=hot: 시간 가중치 랭킹(RankingService, Redis ZSET).
 * - type=views|comments|likes: 해당 카운트 내림차순(+ period가 있으면 그 기간 내 작성글로 한정).
 */
export class RankingQueryDto {
  @ApiPropertyOptional({ enum: RANKING_TYPES, default: 'hot' })
  @IsOptional()
  @IsIn(RANKING_TYPES)
  type?: RankingType;

  @ApiPropertyOptional({
    enum: ['daily', 'weekly', 'monthly'],
    description: 'hot은 랭킹 기간, 그 외 type은 집계 기간 창(생략 시 전체 기간)',
  })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  period?: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
