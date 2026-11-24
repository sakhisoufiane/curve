import type { CookieSetOptions } from 'universal-cookie';

export const getAuthCookieOptions = (): CookieSetOptions => ({
  secure: window.location.protocol === 'https:',
  path: '/',
  sameSite: 'lax',
  maxAge: 604800,
});
