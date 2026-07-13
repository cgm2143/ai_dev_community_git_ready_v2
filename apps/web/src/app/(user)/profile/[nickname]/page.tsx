'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserRound, Settings } from 'lucide-react';
import { useProfile } from '@/features/users/hooks/useProfile';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ProfilePage({ params }: { params: { nickname: string } }) {
  const { data: profile, isLoading, isError } = useProfile(params.nickname);
  const currentUser = useAuthStore((state) => state.user);
  const isOwnProfile = currentUser?.nickname.normalize('NFC') === params.nickname.normalize('NFC');

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-card bg-bg-surface-muted" />;
  }

  if (isError || !profile) {
    return (
      <p className="rounded-card border border-border-hairline bg-bg-surface p-6 text-center text-sm text-text-secondary">
        존재하지 않는 회원이거나 탈퇴한 계정입니다.
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        {profile.profileImageUrl ? (
          <Image
            src={profile.profileImageUrl}
            alt={profile.nickname}
            width={72}
            height={72}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-bg-surface-muted">
            <UserRound className="h-8 w-8 text-text-muted" />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl font-semibold text-text-primary">{profile.nickname}</h1>
            {isOwnProfile && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="h-3.5 w-3.5" /> 설정
                </Link>
              </Button>
            )}
          </div>
          <p className="text-sm text-text-secondary">{profile.bio ?? '소개글이 없습니다.'}</p>
          <p className="font-mono text-xs text-text-muted">
            {new Date(profile.createdAt).toLocaleDateString('ko-KR')} 가입
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
