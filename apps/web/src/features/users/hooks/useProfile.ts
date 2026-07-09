'use client';

import { useQuery } from '@tanstack/react-query';
import { getPublicProfile } from '../api/users.api';

export function useProfile(nickname: string) {
  return useQuery({
    queryKey: ['profile', nickname],
    queryFn: () => getPublicProfile(nickname),
    enabled: Boolean(nickname),
  });
}
