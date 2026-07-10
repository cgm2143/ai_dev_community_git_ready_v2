'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api-error';

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });
  const loginMutation = useLogin();

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>로그인</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-accent-danger">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <p className="text-xs text-accent-danger">{errors.password.message}</p>}
          </div>

          {loginMutation.isError && (
            <p className="rounded-md bg-accent-danger/10 px-3 py-2 text-xs text-accent-danger">
              {loginMutation.error instanceof ApiError
                ? loginMutation.error.message
                : '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </Button>

          <Button type="button" variant="outline" size="lg" asChild>
            <Link href="/register">코비온 회원가입</Link>
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border-hairline" />
          <span className="text-xs text-text-muted">또는 소셜 계정으로 계속하기</span>
          <div className="h-px flex-1 bg-border-hairline" />
        </div>

        <SocialLoginButtons />

        <div className="mt-5 text-center text-sm text-text-secondary">
          <Link href="/password/forgot" className="hover:text-accent-primary-strong">
            비밀번호를 잊으셨나요?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
