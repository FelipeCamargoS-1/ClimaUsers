import crypto from 'crypto';
import { env } from '../config/env';

function signToken(token: string) {
  return crypto.createHmac('sha256', env.CSRF_SECRET).update(token).digest('hex');
}

export function createCsrfCookieValue() {
  const token = crypto.randomBytes(32).toString('hex');
  return `${token}.${signToken(token)}`;
}

export function extractCsrfToken(cookieValue?: string) {
  if (!cookieValue) return undefined;

  const [token, signature] = cookieValue.split('.');
  if (!token || !signature) return undefined;

  const expectedSignature = signToken(token);
  const provided = Buffer.from(signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');

  if (provided.length !== expected.length) return undefined;
  if (!crypto.timingSafeEqual(provided, expected)) return undefined;

  return token;
}
