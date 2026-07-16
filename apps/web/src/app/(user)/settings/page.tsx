'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { UserRound } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useProfile } from '@/features/users/hooks/useProfile';
import {
  useUpdateProfile,
  useChangePassword,
  useUploadProfileImage,
  useDeleteProfileImage,
  useWithdrawAccount,
  useBlockedUsers,
  useUnblockUser,
} from '@/features/users/hooks/useUserSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-error';

const profileSchema = z.object({
  nickname: z.string().min(2, '닉네임은 2자 이상이어야 합니다.').max(20, '닉네임은 20자 이하여야 합니다.'),
  bio: z.string().max(200, '소개글은 200자 이하여야 합니다.').optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해 주세요.'),
    newPassword: z.string().min(8, '새 비밀번호는 8자 이상이어야 합니다.'),
    newPasswordConfirm: z.string().min(1, '새 비밀번호를 다시 입력해 주세요.'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: '새 비밀번호가 일치하지 않습니다.',
    path: ['newPasswordConfirm'],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

function ProfileSection() {
  const user = useAuthStore((state) => state.user);
  const { data: profile } = useProfile(user?.nickname ?? '');
  const updateMutation = useUpdateProfile();
  const uploadMutation = useUploadProfileImage();
  const deleteImageMutation = useDeleteProfileImage();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nickname: '', bio: '' },
  });

  // profile 쿼리가 로드된 "그 순간에만" 폼 값을 채운다 - 매 렌더링마다 새 객체를 넘기는
  // 방식(values prop)은 react-hook-form이 그때마다 폼을 초기화해버려 입력 중이던 내용이
  // 계속 지워지는 문제가 있었다. reset()은 이 effect가 실행될 때 딱 한 번만 값을 채운다.
  React.useEffect(() => {
    if (profile) {
      reset({ nickname: profile.nickname, bio: profile.bio ?? '' });
    }
  }, [profile, reset]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>프로필</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {profile?.profileImageUrl ? (
            <Image
              src={profile.profileImageUrl}
              alt={profile.nickname}
              width={64}
              height={64}
              className="rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-bg-surface-muted">
              <UserRound className="h-7 w-7 text-text-muted" />
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending || deleteImageMutation.isPending}
              >
                {uploadMutation.isPending ? '업로드 중...' : '프로필 이미지 변경'}
              </Button>
              {profile?.profileImageUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteImageMutation.mutate()}
                  disabled={uploadMutation.isPending || deleteImageMutation.isPending}
                >
                  {deleteImageMutation.isPending ? '변경 중...' : '기본 이미지로'}
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs text-text-muted">JPG/PNG/WebP, 최대 5MB</p>
            {uploadMutation.isError && (
              <p className="mt-1 text-xs text-accent-danger">
                {uploadMutation.error instanceof ApiError
                  ? uploadMutation.error.message
                  : '이미지 업로드에 실패했습니다. 스토리지 설정을 확인해 주세요.'}
              </p>
            )}
            {uploadMutation.isSuccess && <p className="mt-1 text-xs text-accent-ai-teal">변경되었습니다.</p>}
            {deleteImageMutation.isError && (
              <p className="mt-1 text-xs text-accent-danger">
                {deleteImageMutation.error instanceof ApiError
                  ? deleteImageMutation.error.message
                  : '기본 이미지로 변경에 실패했습니다.'}
              </p>
            )}
            {deleteImageMutation.isSuccess && (
              <p className="mt-1 text-xs text-accent-ai-teal">기본 이미지로 변경되었습니다.</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit((values) => updateMutation.mutate(values))} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nickname">닉네임</Label>
            <Input id="nickname" {...register('nickname')} />
            {errors.nickname && <p className="text-xs text-accent-danger">{errors.nickname.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">소개글</Label>
            <Input id="bio" {...register('bio')} placeholder="자기소개를 입력해 주세요" />
          </div>
          {updateMutation.isError && (
            <p className="text-xs text-accent-danger">
              {updateMutation.error instanceof ApiError ? updateMutation.error.message : '저장에 실패했습니다.'}
            </p>
          )}
          {updateMutation.isSuccess && <p className="text-xs text-accent-ai-teal">저장되었습니다.</p>}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordSection() {
  const mutation = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>비밀번호 변경</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values, { onSuccess: () => reset() }))}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">현재 비밀번호</Label>
            <Input id="currentPassword" type="password" {...register('currentPassword')} />
            {errors.currentPassword && (
              <p className="text-xs text-accent-danger">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input id="newPassword" type="password" {...register('newPassword')} />
            {errors.newPassword && <p className="text-xs text-accent-danger">{errors.newPassword.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPasswordConfirm">새 비밀번호 확인</Label>
            <Input id="newPasswordConfirm" type="password" {...register('newPasswordConfirm')} />
            {errors.newPasswordConfirm && (
              <p className="text-xs text-accent-danger">{errors.newPasswordConfirm.message}</p>
            )}
          </div>
          {mutation.isError && (
            <p className="text-xs text-accent-danger">
              {mutation.error instanceof ApiError ? mutation.error.message : '변경에 실패했습니다.'}
            </p>
          )}
          {mutation.isSuccess && (
            <p className="text-xs text-accent-ai-teal">비밀번호가 변경되었습니다. 다른 기기는 모두 로그아웃됩니다.</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? '변경 중...' : '변경'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BlockedUsersSection() {
  const { data: blockedUsers, isLoading } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>차단한 사용자</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-text-muted">불러오는 중...</p>}
        {blockedUsers?.length === 0 && <p className="text-sm text-text-muted">차단한 사용자가 없습니다.</p>}
        {blockedUsers?.map((blocked) => (
          <div
            key={blocked.id}
            className="flex items-center justify-between rounded-md border border-border-hairline p-2"
          >
            <span className="text-sm text-text-primary">{blocked.nickname}</span>
            <Button variant="ghost" size="sm" onClick={() => unblockMutation.mutate(blocked.id)}>
              차단 해제
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WithdrawSection() {
  const [password, setPassword] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const withdrawMutation = useWithdrawAccount();

  return (
    <Card className="border-accent-danger/40">
      <CardHeader>
        <CardTitle className="text-accent-danger">회원 탈퇴</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          탈퇴 시 계정 정보는 즉시 익명화되며, 작성한 게시글/댓글은 남아있지만 작성자 정보가 표시되지 않습니다.
        </p>
        {!confirmOpen ? (
          <Button variant="danger" size="sm" className="w-fit" onClick={() => setConfirmOpen(true)}>
            탈퇴하기
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              type="password"
              placeholder="비밀번호 확인 (소셜 로그인으로 가입하셨다면 비워두세요)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {withdrawMutation.isError && (
              <p className="text-xs text-accent-danger">
                {withdrawMutation.error instanceof ApiError ? withdrawMutation.error.message : '탈퇴에 실패했습니다.'}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
                취소
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => withdrawMutation.mutate(password || undefined)}
                disabled={withdrawMutation.isPending}
              >
                {withdrawMutation.isPending ? '처리 중...' : '탈퇴 확정'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { isChecking } = useRequireAuth();

  if (isChecking) {
    return <div className="h-64 animate-pulse rounded-card bg-bg-surface-muted" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-text-primary">설정</h1>
      <ProfileSection />
      <PasswordSection />
      <BlockedUsersSection />
      <WithdrawSection />
    </div>
  );
}
