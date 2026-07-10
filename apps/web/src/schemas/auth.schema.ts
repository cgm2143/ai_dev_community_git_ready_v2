import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, '이메일을 입력해 주세요.').email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

// 백엔드 password.service.ts 정책과 동일: 8자 이상, 대/소문자+숫자+특수문자 각 1개 이상
const PASSWORD_POLICY_MESSAGE = '8자 이상, 영문 대/소문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다.';
const passwordSchema = z
  .string()
  .min(8, PASSWORD_POLICY_MESSAGE)
  .regex(/[a-z]/, PASSWORD_POLICY_MESSAGE)
  .regex(/[A-Z]/, PASSWORD_POLICY_MESSAGE)
  .regex(/[0-9]/, PASSWORD_POLICY_MESSAGE)
  .regex(/[^a-zA-Z0-9]/, PASSWORD_POLICY_MESSAGE);

export const registerSchema = z
  .object({
    email: z.string().min(1, '이메일을 입력해 주세요.').email('올바른 이메일 형식이 아닙니다.'),
    nickname: z
      .string()
      .min(2, '닉네임은 2자 이상이어야 합니다.')
      .max(20, '닉네임은 20자 이하여야 합니다.'),
    password: passwordSchema,
    passwordConfirm: z.string().min(1, '비밀번호를 다시 입력해 주세요.'),
    agreeTerms: z.boolean().refine((v) => v === true, '이용약관에 동의해 주세요.'),
    agreePrivacy: z.boolean().refine((v) => v === true, '개인정보처리방침에 동의해 주세요.'),
    agreeAge: z.boolean().refine((v) => v === true, '만 14세 이상임을 확인해 주세요.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;
