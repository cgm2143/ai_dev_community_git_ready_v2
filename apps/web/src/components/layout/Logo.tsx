import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  href?: string;
  height?: number;
  className?: string;
}

/** 헤더/로그인/관리자 화면 등에서 공통으로 쓰는 코비온 로고. */
export function Logo({ href = '/', height = 28, className }: LogoProps) {
  // 원본 이미지 비율(2167x574)을 유지해 높이만 지정하면 너비가 자동 계산되도록 한다.
  const width = Math.round((2167 / 574) * height);

  const image = (
    <Image
      src="/logo-horizontal.png"
      alt="코비온"
      width={width}
      height={height}
      priority
      className={cn('object-contain', className)}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} className="shrink-0">
      {image}
    </Link>
  );
}
