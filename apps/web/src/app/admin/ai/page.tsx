'use client';

import { Sparkles } from 'lucide-react';

/**
 * AI 운영 대시보드 — UI 목업(Mock)입니다.
 * 이번 단계에서는 화면 설계만 확정하고, 실제 데이터 연동(AiRequestLog 집계 API)은 다음 단계에서 구현합니다.
 * 표시되는 수치는 모두 예시 값입니다.
 */

interface StatCard {
  label: string;
  value: string;
  hint?: string;
}

const STATUS: { label: string; value: string }[] = [
  { label: 'Provider', value: 'anthropic' },
  { label: 'Model', value: 'claude-haiku-4-5' },
  { label: 'Summary Prompt', value: 'v1' },
  { label: 'Tag Prompt', value: 'v1' },
];

const METRICS: StatCard[] = [
  { label: '최근 24시간 요청 수', value: '1,284', hint: '요약 902 · 태그 382' },
  { label: '최근 24시간 실패 수', value: '7', hint: '실패율 0.5%' },
  { label: '평균 응답 속도', value: '1.9s', hint: '요약 기준' },
  { label: '캐시 적중률', value: '86%', hint: '요약 조회 대비 생성' },
  { label: '예상 비용 (24h)', value: '$0.41', hint: '추정치' },
  { label: '예상 비용 (30d)', value: '$11.7', hint: '추정치' },
];

export default function AdminAiPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent-primary" aria-hidden />
        <h1 className="font-display text-xl font-semibold text-text-primary">AI 운영</h1>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
          UI 목업 · 데이터 미연동
        </span>
      </div>

      <p className="text-sm text-text-secondary">
        이 화면은 설계용 목업입니다. 표시된 수치는 예시이며, 실제 집계는 <code>AiRequestLog</code> 기반 관리자 API 구현 시
        연동됩니다.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-primary">현재 설정</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUS.map((item) => (
            <div key={item.label} className="rounded-card border border-border-hairline bg-bg-surface p-4">
              <p className="text-xs text-text-muted">{item.label}</p>
              <p className="mt-1 font-mono text-sm font-semibold text-text-primary">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-primary">최근 지표</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((card) => (
            <div key={card.label} className="rounded-card border border-border-hairline bg-bg-surface p-4">
              <p className="text-xs text-text-muted">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{card.value}</p>
              {card.hint && <p className="mt-1 text-xs text-text-secondary">{card.hint}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-primary">최근 요청 로그 (예시)</h2>
        <div className="overflow-x-auto rounded-card border border-border-hairline bg-bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-hairline text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">종류</th>
                <th className="px-4 py-2 font-medium">모델</th>
                <th className="px-4 py-2 font-medium">토큰</th>
                <th className="px-4 py-2 font-medium">응답</th>
                <th className="px-4 py-2 font-medium">비용</th>
                <th className="px-4 py-2 font-medium">결과</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {[
                { kind: 'SUMMARY', tokens: '1,240', time: '1.7s', cost: '$0.0004', ok: true },
                { kind: 'SUGGEST_TAGS', tokens: '820', time: '1.1s', cost: '$0.0002', ok: true },
                { kind: 'SUMMARY', tokens: '—', time: '20.0s', cost: '$0', ok: false },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border-hairline last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{row.kind}</td>
                  <td className="px-4 py-2 font-mono text-xs">claude-haiku-4-5</td>
                  <td className="px-4 py-2">{row.tokens}</td>
                  <td className="px-4 py-2">{row.time}</td>
                  <td className="px-4 py-2">{row.cost}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        row.ok
                          ? 'rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600'
                          : 'rounded-full bg-accent-danger/10 px-2 py-0.5 text-xs text-accent-danger'
                      }
                    >
                      {row.ok ? '성공' : '실패'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
