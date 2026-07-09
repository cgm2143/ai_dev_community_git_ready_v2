import { api, type AuthSessionResponse } from '@/lib/api-client';
import type { LoginFormValues, RegisterFormValues } from '@/schemas/auth.schema';

export function login(values: LoginFormValues) {
  return api.post<AuthSessionResponse>('/auth/login', values);
}

export function register(values: Omit<RegisterFormValues, 'passwordConfirm'>) {
  return api.post<AuthSessionResponse>('/auth/register', values);
}

export function logout() {
  return api.post<void>('/auth/logout');
}
