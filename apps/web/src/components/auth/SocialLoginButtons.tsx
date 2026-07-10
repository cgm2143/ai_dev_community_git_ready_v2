const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * 소셜 로그인 버튼은 fetch가 아니라 일반 페이지 이동(전체 페이지 리다이렉트)이어야 한다 -
 * OAuth 인증 페이지(네이버/카카오/구글)로 브라우저 자체가 이동해야 하기 때문이다.
 * 그래서 <a href> 태그를 그대로 쓴다(클릭 핸들러로 fetch하지 않음).
 */
export function SocialLoginButtons() {
  return (
    <div className="flex flex-col gap-2">
      <a
        href={`${API_BASE_URL}/v1/auth/naver`}
        className="flex h-10 items-center justify-center rounded-md bg-[#03C75A] text-sm font-medium text-white hover:opacity-90"
      >
        네이버로 로그인
      </a>
      <a
        href={`${API_BASE_URL}/v1/auth/kakao`}
        className="flex h-10 items-center justify-center rounded-md bg-[#FEE500] text-sm font-medium text-[#191919] hover:opacity-90"
      >
        카카오로 로그인
      </a>
      <a
        href={`${API_BASE_URL}/v1/auth/google`}
        className="flex h-10 items-center justify-center gap-2 rounded-md border border-border-hairline bg-white text-sm font-medium text-[#191919] hover:bg-bg-surface-muted"
      >
        Google로 로그인
      </a>
    </div>
  );
}
