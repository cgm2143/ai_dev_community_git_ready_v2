'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '@/schemas/auth.schema';
import { useRegister } from '@/features/auth/hooks/useRegister';
import { TermsAgreement } from '@/components/auth/TermsAgreement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api-error';

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { agreeTerms: false, agreePrivacy: false, agreeAge: false },
  });
  const registerMutation = useRegister();

  const onSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>회원가입</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-accent-danger">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nickname">닉네임</Label>
            <Input id="nickname" autoComplete="nickname" {...register('nickname')} />
            {errors.nickname && <p className="text-xs text-accent-danger">{errors.nickname.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <p className="text-xs text-accent-danger">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
            <Input id="passwordConfirm" type="password" autoComplete="new-password" {...register('passwordConfirm')} />
            {errors.passwordConfirm && (
              <p className="text-xs text-accent-danger">{errors.passwordConfirm.message}</p>
            )}
          </div>

          <TermsAgreement register={register} watch={watch} setValue={setValue} errors={errors} />

          {registerMutation.isError && (
            <p className="rounded-md bg-accent-danger/10 px-3 py-2 text-xs text-accent-danger">
              {registerMutation.error instanceof ApiError
                ? registerMutation.error.message
                : '가입 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? '가입 처리 중...' : '가입하기'}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-text-secondary">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-medium text-accent-primary-strong hover:underline">
            로그인
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
