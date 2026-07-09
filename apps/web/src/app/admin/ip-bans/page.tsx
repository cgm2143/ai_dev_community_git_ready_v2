'use client';

import * as React from 'react';
import { useIpBans, useAddIpBan, useRemoveIpBan } from '@/features/admin/hooks/useAdmin';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminIpBansPage() {
  const { data: bans, isLoading } = useIpBans();
  const addMutation = useAddIpBan();
  const removeMutation = useRemoveIpBan();
  const [form, setForm] = React.useState({ ipAddress: '', reason: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(
      { ipAddress: form.ipAddress, reason: form.reason || undefined },
      { onSuccess: () => setForm({ ipAddress: '', reason: '' }) },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-text-primary">IP 차단</h1>
      <p className="text-sm text-text-secondary">
        IP 차단은 신규 요청만 막습니다. 이미 로그인된 세션을 끊으려면 회원 관리에서 계정을 정지하세요.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>새 IP 차단</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ipAddress">IP 주소</Label>
              <Input
                id="ipAddress"
                value={form.ipAddress}
                onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                placeholder="203.0.113.10"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">사유</Label>
              <Input
                id="reason"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="어뷰징"
              />
            </div>
            <Button type="submit" variant="primary" disabled={addMutation.isPending}>
              차단
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-text-muted">불러오는 중...</p>}
        {bans?.map((ban) => (
          <div
            key={ban.id}
            className="flex items-center justify-between rounded-card border border-border-hairline bg-bg-surface p-3"
          >
            <div>
              <p className="font-mono text-sm text-text-primary">{ban.ipAddress}</p>
              <p className="text-xs text-text-muted">
                {ban.reason ?? '사유 없음'} ·{' '}
                {ban.expiresAt ? `~${new Date(ban.expiresAt).toLocaleDateString('ko-KR')}` : '무기한'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => removeMutation.mutate(ban.id)}>
              해제
            </Button>
          </div>
        ))}
        {bans?.length === 0 && <p className="text-sm text-text-muted">차단된 IP가 없습니다.</p>}
      </div>
    </div>
  );
}
