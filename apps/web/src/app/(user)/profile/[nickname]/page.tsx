'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserRound, Settings } from 'lucide-react';
import { useProfile } from '@/features/users/hooks/useProfile';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookmarksSection } from '@/components/profile/BookmarksSection';

export default function ProfilePage({ params }: { params: { nickname: string } }) {
  const { data: profile, isLoading, isError } = useProfile(params.nickname);
  const currentUser = useAuthStore((state) => state.user);

  // 닉네임 문자열(특히 한글)은 유니코드 정규화 차이 등으로 겉보기엔 같아도 비교가
  // 어긋날 수 있어, 훨씬 안정적인 회원 ID로 "내 프로필인지"를 판단한다.

  const isOwnProfile = Boolean(currentUser && profile && currentUser.id === profile.id);

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
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-center gap-4 pt-5">
        {profile.profileImageUrl ? (
          <Image
            src={profile.profileImageUrl}
            alt={profile.nickname}
            width={72}
            height={72}
            className="rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-lg bg-bg-surface-muted">
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

      {isOwnProfile && <BookmarksSection />}
    </div>
  );
}
