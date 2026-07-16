import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 이용약관/개인정보처리방침처럼 "제목 + 긴 본문 텍스트"만 보여주는 정적 법률 문서를
 * 동일한 형태로 렌더링하는 공용 컴포넌트. 본문은 terms-content.ts의 상수를 그대로
 * 재사용하므로(회원가입 폼의 약관 모달과 같은 출처), 문구가 한 곳에서만 관리된다.
 */
export function LegalDocument({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">{body}</p>
      </CardContent>
    </Card>
  );
}
