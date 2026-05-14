import { env } from './env.js';

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: Boolean(env.COOKIE_SECURE),
    sameSite: env.COOKIE_SAMESITE,
    path: '/api/v1/auth',
  };
}

export function clearRefreshCookieOptions() {
  return {
    ...refreshCookieOptions(),
    maxAge: 0,
  };
}