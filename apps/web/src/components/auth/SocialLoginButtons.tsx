import Image from 'next/image';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * 각 아이콘은 실제 회사의 공식 로고 파일을 그대로 쓰는 대신, 브랜드 색상에 맞춘
 * 간단한 이니셜/기호로 표현했다 - 실제 서비스에 적용할 때는 각 회사 개발자센터가
 * 제공하는 공식 "OO로 로그인" 버튼 에셋으로 교체하는 것을 권장한다
 * (브랜드 가이드라인상 정확한 로고 사용이 요구되는 경우가 많다).
 */
function NaverIcon() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded bg-white text-[11px] font-bold text-[#03C75A]">
      N
    </span>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#191919"
        d="M12 4C6.9 4 2.75 7.32 2.75 11.42c0 2.63 1.72 4.94 4.32 6.26-.19.7-.7 2.55-.8 2.94-.12.48.18.47.38.34.16-.1 2.5-1.7 3.52-2.39.6.09 1.22.13 1.83.13 5.1 0 9.25-3.32 9.25-7.28C21.25 7.32 17.1 4 12 4Z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return <Image src="/google-logo.png" alt="Google" width={20} height={20} className="h-5 w-5 object-contain" />;
}

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
        className="relative flex h-10 items-center justify-center rounded-md bg-[#03C75A] text-sm font-medium text-white hover:opacity-90"
      >
        <span className="absolute left-3">
          <NaverIcon />
        </span>
        네이버로 로그인
      </a>
      <a
        href={`${API_BASE_URL}/v1/auth/kakao`}
        className="relative flex h-10 items-center justify-center rounded-md bg-[#FEE500] text-sm font-medium text-[#191919] hover:opacity-90"
      >
        <span className="absolute left-3">
          <KakaoIcon />
        </span>
        카카오로 로그인
      </a>
      <a
        href={`${API_BASE_URL}/v1/auth/google`}
        className="relative flex h-10 items-center justify-center gap-2 rounded-md border border-border-hairline bg-white text-sm font-medium text-[#191919] hover:bg-bg-surface-muted"
      >
        <span className="absolute left-3">
          <GoogleIcon />
        </span>
        Google로 로그인
      </a>
    </div>
  );
}
