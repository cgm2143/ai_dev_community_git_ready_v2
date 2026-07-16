import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { PRIVACY_POLICY_TEXT } from '@/features/auth/constants/terms-content';

export const metadata: Metadata = {
  title: '개인정보처리방침 — 코비온',
};

export default function PrivacyPage() {
  return <LegalDocument title="개인정보처리방침" body={PRIVACY_POLICY_TEXT} />;
}
