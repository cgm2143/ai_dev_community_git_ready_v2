'use client';

import * as React from 'react';
import { useAdminUsers, useUpdateUserStatus, useUpdateUserRole } from '@/features/admin/hooks/useAdmin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ROLE_OPTIONS = ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];

export default function AdminUsersPage() {
  const [keyword, setKeyword] = React.useState('');
  const { data, isLoading } = useAdminUsers({ keyword: keyword || undefined });
  const updateStatus = useUpdateUserStatus();
  const updateRole = useUpdateUserRole();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-text-primary">회원 관리</h1>

      <Input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="닉네임 또는 이메일 검색"
        className="max-w-sm"
      />

      <div className="overflow-x-auto rounded-card border border-border-hairline bg-bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border-hairline text-left text-xs text-text-muted">
            <tr>
              <th className="p-3">닉네임</th>
              <th className="p-3">이메일</th>
              <th className="p-3">역할</th>
              <th className="p-3">상태</th>
              <th className="p-3">가입일</th>
              <th className="p-3">작업</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-text-muted">
                  불러오는 중...
                </td>
              </tr>
            )}
            {data?.items.map((user) => (
              <tr key={user.id} className="border-b border-border-hairline last:border-0">
                <td className="p-3 font-medium text-text-primary">{user.nickname}</td>
                <td className="p-3 text-text-secondary">{user.email}</td>
                <td className="p-3">
                  <select
                    value={user.role}
                    onChange={(e) => updateRole.mutate({ userId: user.id, roleName: e.target.value })}
                    className="rounded border border-border-hairline bg-bg-surface px-2 py-1 text-xs"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <span
                    className={
                      user.status === 'ACTIVE'
                        ? 'rounded bg-accent-ai-teal/15 px-2 py-0.5 text-xs text-accent-ai-teal'
                        : 'rounded bg-accent-danger/15 px-2 py-0.5 text-xs text-accent-danger'
                    }
                  >
                    {user.status}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs text-text-muted">
                  {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateStatus.mutate({
                        userId: user.id,
                        status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                      })
                    }
                  >
                    {user.status === 'ACTIVE' ? '정지' : '활성화'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
