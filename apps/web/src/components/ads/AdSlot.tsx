'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface ActiveAd {
  id: string;
  type: 'IMAGE' | 'HTML' | 'SCRIPT' | 'ADSENSE';
  purpose: 'AD' | 'EVENT_BANNER';
  content: string;
  linkUrl: string | null;
}

function recordImpression(adId: string) {
  // 실패해도 사용자 경험에 영향이 없는 최선 노력(best-effort) 호출이라 결과를 기다리지 않는다.
  // 백엔드가 IP+광고 조합으로 1분 쿨다운을 두고 있어(11단계), 여기서 중복 호출해도 안전하다.
  void api.post(`/ads/${adId}/impression`).catch(() => undefined);
}

function recordClick(adId: string) {
  void api.post(`/ads/${adId}/click`).catch(() => undefined);
}

export function AdSlot({ slotCode }: { slotCode: string }) {
  const { data: ad } = useQuery({
    queryKey: ['ad-slot', slotCode],
    queryFn: () => api.get<ActiveAd | null>(`/ads/slots/${slotCode}`),
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (ad) recordImpression(ad.id);
  }, [ad]);

  if (!ad) return null;

  return (
    <div className="overflow-hidden rounded-card border border-border-hairline bg-bg-surface-muted">
      {ad.type === 'IMAGE' ? (
        <a href={ad.linkUrl ?? '#'} target="_blank" rel="noopener noreferrer" onClick={() => recordClick(ad.id)}>
          {/* 광고 이미지는 외부/미확정 도메인이 대부분이라 next/image 최적화 대상에서 제외한다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.content} alt="광고" className="w-full" />
        </a>
      ) : (
        <p className="p-3 text-xs text-text-muted">광고 콘텐츠 (type: {ad.type})</p>
      )}
    </div>
  );
}
