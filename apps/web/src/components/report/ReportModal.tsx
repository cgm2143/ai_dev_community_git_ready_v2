'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useCreateReport } from '@/features/reports/hooks/useCreateReport';
import type { ReportReason, ReportTargetType } from '@/features/reports/api/reports.api';
import { ApiError } from '@/lib/api-error';

/** 기존 enum(SPAM/ABUSE/ILLEGAL/ETC)에 사용자 친화적 문구만 매핑한다. DB/모델 변경 없음. */
const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: '스팸/광고' },
  { value: 'ABUSE', label: '욕설/혐오 발언' },
  { value: 'ILLEGAL', label: '불법/유해 콘텐츠' },
  { value: 'ETC', label: '기타 (직접 입력)' },
];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}

export function ReportModal({ open, onClose, targetType, targetId }: ReportModalProps) {
  const [reason, setReason] = React.useState<ReportReason>('SPAM');
  const [description, setDescription] = React.useState('');
  const [done, setDone] = React.useState(false);
  const mutation = useCreateReport();

  // 모달이 열릴 때마다 입력/에러/완료 상태를 초기화한다.
  React.useEffect(() => {
    if (open) {
      setReason('SPAM');
      setDescription('');
      setDone(false);
      mutation.reset();
    }
    // mutation은 매 렌더 새 참조라 의존성에서 제외한다(열림 시 1회만 초기화).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isEtc = reason === 'ETC';
  const canSubmit = !mutation.isPending && (!isEtc || description.trim().length > 0);
  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.isError
        ? '신고 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate(
      { targetType, targetId, reason, description: description.trim() || undefined },
      { onSuccess: () => setDone(true) },
    );
  };

  const targetLabel = targetType === 'POST' ? '게시글' : '댓글';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-card border border-border-hairline bg-bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-text-primary">신고가 접수되었습니다</h2>
              <p className="mt-1 text-sm text-text-secondary">검토 후 처리 결과를 알림으로 알려드리겠습니다.</p>
            </div>
            <Button size="sm" onClick={onClose} className="self-end">
              닫기
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-text-primary">{targetLabel} 신고</h2>
              <p className="mt-1 text-sm text-text-secondary">신고 사유를 선택해 주세요.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              {REASONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-primary hover:bg-bg-surface-muted"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="h-4 w-4 accent-accent-primary-strong"
                  />
                  {option.label}
                </label>
              ))}
            </div>

            {isEtc && (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="신고 사유를 입력해 주세요."
                rows={3}
                maxLength={500}
                className="w-full rounded-md border border-border-hairline bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                aria-label="기타 신고 사유"
              />
            )}

            {errorMessage && <p className="text-sm text-accent-danger">{errorMessage}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" size="sm" disabled={!canSubmit}>
                {mutation.isPending ? '접수 중...' : '신고하기'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
