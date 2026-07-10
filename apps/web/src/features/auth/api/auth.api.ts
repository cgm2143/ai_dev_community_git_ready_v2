import { api, type AuthSessionResponse } from '@/lib/api-client';
import type { LoginFormValues, RegisterFormValues } from '@/schemas/auth.schema';

export function login(values: LoginFormValues) {
  return api.post<AuthSessionResponse>('/auth/login', values);
}

export interface RegisterPayload {
  email: string;
  nickname: string;
  password: string;
}

export function register(values: RegisterPayload) {
  return api.post<AuthSessionResponse>('/auth/register', values);
}

export function logout() {
  return api.post<void>('/auth/logout');
}
