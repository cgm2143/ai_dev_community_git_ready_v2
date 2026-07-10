'use client';

import * as React from 'react';
import type { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import type { RegisterFormValues } from '@/schemas/auth.schema';
import { TERMS_OF_SERVICE_TEXT, PRIVACY_POLICY_TEXT, AGE_CONFIRMATION_TEXT } from '@/features/auth/constants/terms-content';
import { cn } from '@/lib/utils';

interface TermsAgreementProps {
  register: UseFormRegister<RegisterFormValues>;
  watch: UseFormWatch<RegisterFormValues>;
  setValue: UseFormSetValue<RegisterFormValues>;
  errors: FieldErrors<RegisterFormValues>;
}

interface AgreementItem {
  key: 'agreeTerms' | 'agreePrivacy' | 'agreeAge';
  label: string;
  content: string;
}

const ITEMS: AgreementItem[] = [
  { key: 'agreeTerms', label: '[필수] 이용약관 동의', content: TERMS_OF_SERVICE_TEXT },
  { key: 'agreePrivacy', label: '[필수] 개인정보처리방침 동의', content: PRIVACY_POLICY_TEXT },
  { key: 'agreeAge', label: '[필수] 만 14세 이상입니다', content: AGE_CONFIRMATION_TEXT },
];

function AgreementRow({
  item,
  register,
  error,
}: {
  item: AgreementItem;
  register: UseFormRegister<RegisterFormValues>;
  error?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            {...register(item.key)}
            className="h-4 w-4 rounded border-border-hairline accent-accent-primary-strong"
          />
          {item.label}
        </label>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-0.5 text-xs text-text-muted hover:text-text-secondary"
          aria-expanded={expanded}
        >
          내용 보기
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>
      {expanded && (
        <pre className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-bg-surface-muted p-3 font-body text-xs leading-relaxed text-text-secondary">
          {item.content}
        </pre>
      )}
      {error && <p className="mt-1 text-xs text-accent-danger">{error}</p>}
    </div>
  );
}

/**
 * 회원가입 약관 동의 섹션. 실제 약관 문구는 terms-content.ts에 있는데, 법률 검토 전
 * 일반적인 예시 문구이므로 실제 서비스 오픈 전 반드시 검토된 내용으로 교체해야 한다.
 */
export function TermsAgreement({ register, watch, setValue, errors }: TermsAgreementProps) {
  const values = watch();
  const allChecked = ITEMS.every((item) => values[item.key]);

  const toggleAll = () => {
    const next = !allChecked;
    ITEMS.forEach((item) => setValue(item.key, next, { shouldValidate: true }));
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border-hairline p-3">
      <label className="flex cursor-pointer items-center gap-2 border-b border-border-hairline pb-3 text-sm font-semibold text-text-primary">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-border-hairline accent-accent-primary-strong"
        />
        전체 동의합니다
      </label>

      {ITEMS.map((item) => (
        <AgreementRow key={item.key} item={item} register={register} error={errors[item.key]?.message} />
      ))}
    </div>
  );
}
