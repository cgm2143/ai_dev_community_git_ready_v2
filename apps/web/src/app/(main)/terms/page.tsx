import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { TERMS_OF_SERVICE_TEXT } from '@/features/auth/constants/terms-content';

export const metadata: Metadata = {
  title: '이용약관 — 코비온',
};

export default function TermsPage() {
  return <LegalDocument title="이용약관" body={TERMS_OF_SERVICE_TEXT} />;
}
