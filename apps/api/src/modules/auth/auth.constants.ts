export const REFRESH_JWT_SERVICE = Symbol('REFRESH_JWT_SERVICE');

/** Refresh Token을 전달하는 HttpOnly 쿠키 이름 */
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Refresh Token 쿠키의 경로를 /v1/auth 로 한정한다.
 * 다른 API 요청에는 자동으로 실려 나가지 않도록 노출 범위를 최소화한다.
 */
export const REFRESH_TOKEN_COOKIE_PATH = '/v1/auth';
