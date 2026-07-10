import { Logo } from '@/components/layout/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-page px-4">
      <div className="mb-8">
        <Logo height={36} />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
