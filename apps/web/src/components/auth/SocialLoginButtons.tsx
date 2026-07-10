const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[12px] font-bold text-[#4285F4]">
      G
    </span>
  );
}

export function SocialLoginButtons() {
  return (
    <div className="flex flex-col gap-2">
      
        href={`${API_BASE_URL}/v1/auth/naver`}
        className="relative flex h-10 items-center justify-center rounded-md bg-[#03C75A] text-sm font-medium text-white hover:opacity-90"
      >
        <span className="absolute left-3">
          <NaverIcon />
        </span>
        네이버로 로그인
      </a>
      
        href={`${API_BASE_URL}/v1/auth/kakao`}
        className="relative flex h-10 items-center justify-center rounded-md bg-[#FEE500] text-sm font-medium text-[#191919] hover:opacity-90"
      >
        <span className="absolute left-3">
          <KakaoIcon />
        </span>
        카카오로 로그인
      </a>
      
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
