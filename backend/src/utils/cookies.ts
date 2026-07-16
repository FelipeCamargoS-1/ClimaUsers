import { Request } from 'express';
import { env } from '../config/env';

const isProduction = env.NODE_ENV === 'production';

export const SESSION_COOKIE_NAME = isProduction ? '__Host-auth_session' : 'auth_session';
export const CSRF_COOKIE_NAME = isProduction ? '__Host-csrf_token' : 'csrf_token';
export const SESSION_COOKIE_SAME_SITE = isProduction ? 'Strict' : 'Lax';

export function readCookie(req: Request, name: string) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(';').map((item) => item.trim());
  const match = cookies.find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

export function buildCookie(name: string, value: string, options?: { expiresAt?: Date; httpOnly?: boolean }) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', `SameSite=${SESSION_COOKIE_SAME_SITE}`];

  if (options?.httpOnly) parts.push('HttpOnly');
  if (options?.expiresAt) parts.push(`Expires=${options.expiresAt.toUTCString()}`);
  if (isProduction) parts.push('Secure');

  return parts.join('; ');
}

export function buildExpiredCookie(name: string, options?: { httpOnly?: boolean }) {
  return buildCookie(name, '', { httpOnly: options?.httpOnly, expiresAt: new Date(0) });
}
