'use client';

import { useQuery } from '@tanstack/react-query';
import { getRanking, type RankingParams } from '../api/posts.api';

/** 범용 랭킹(hot/views/comments/likes) 조회 훅. 결과는 게시글 목록 배열. */
export function useRankingPosts(params: RankingParams) {
  return useQuery({
    queryKey: ['ranking', params],
    queryFn: () => getRanking(params),
    staleTime: 60 * 1000,
  });
}
