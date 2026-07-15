import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침', emphasis: true },
  { href: '/youth-policy', label: '청소년보호정책' },
  { href: '/contact/ads', label: '광고/제휴' },
  { href: '/contact/report', label: '문의/신고' },
  { href: '/contact/takedown', label: '게시글 중단 요청' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border-hairline bg-bg-surface">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-6">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.emphasis
                  ? 'text-xs font-semibold text-text-primary hover:text-accent-primary-strong'
                  : 'text-xs text-text-secondary hover:text-accent-primary-strong'
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-text-muted">
          COBION은 이용자가 등록한 게시물의 내용에 대해 책임을 지지 않으며, 게시물의 저작권은 각 작성자에게 있습니다.
        </p>

        <p className="font-mono text-xs text-text-muted">
          © {new Date().getFullYear()} COBION. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
