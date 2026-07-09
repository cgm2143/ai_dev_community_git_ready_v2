'use client';

import * as React from 'react';
import { useAdminAds, useCreateAd, useDeleteAd, useAdStats } from '@/features/admin/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function AdStatsBadge({ adId }: { adId: string }) {
  const [show, setShow] = React.useState(false);
  const { data } = useAdStats(adId, show);

  if (!show) {
    return (
      <button
        type="button"
        className="text-xs text-accent-primary-strong hover:underline"
        onClick={() => setShow(true)}
      >
        통계 보기
      </button>
    );
  }

  if (!data) return <span className="text-xs text-text-muted">불러오는 중...</span>;

  return (
    <span className="font-mono text-xs text-text-muted">
      노출 {data.impressionCount} · 클릭 {data.clickCount} · CTR {data.ctr}%
    </span>
  );
}

export default function AdminAdsPage() {
  const { data: ads, isLoading } = useAdminAds();
  const createMutation = useCreateAd();
  const deleteMutation = useDeleteAd();

  const [form, setForm] = React.useState({
    slotCode: '',
    type: 'IMAGE' as const,
    content: '',
    linkUrl: '',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { slotCode: form.slotCode, type: form.type, content: form.content, linkUrl: form.linkUrl || undefined },
      { onSuccess: () => setForm({ slotCode: '', type: 'IMAGE', content: '', linkUrl: '' }) },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-text-primary">광고 관리</h1>

      <Card>
        <CardHeader>
          <CardTitle>새 광고 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slotCode">슬롯 코드</Label>
              <Input
                id="slotCode"
                value={form.slotCode}
                onChange={(e) => setForm({ ...form, slotCode: e.target.value })}
                placeholder="HOME_SIDEBAR_1"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="content">이미지 URL</Label>
              <Input
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="https://..."
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="linkUrl">클릭 시 이동 URL</Label>
              <Input
                id="linkUrl"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" variant="primary" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? '등록 중...' : '등록'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-text-muted">불러오는 중...</p>}
        {ads?.map((ad) => (
          <div
            key={ad.id}
            className="flex items-center justify-between rounded-card border border-border-hairline bg-bg-surface p-3"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="rounded bg-bg-surface-muted px-1.5 py-0.5">{ad.type}</span>
                <span className={ad.isActive ? 'text-accent-ai-teal' : 'text-text-muted'}>
                  {ad.isActive ? '활성' : '비활성'}
                </span>
              </div>
              <p className="max-w-md truncate text-sm text-text-primary">{ad.content}</p>
              <AdStatsBadge adId={ad.id} />
            </div>
            <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(ad.id)}>
              삭제
            </Button>
          </div>
        ))}
        {ads?.length === 0 && <p className="text-sm text-text-muted">등록된 광고가 없습니다.</p>}
      </div>
    </div>
  );
}
