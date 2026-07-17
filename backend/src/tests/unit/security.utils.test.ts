import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME, buildCookie, buildExpiredCookie, readCookie } from '../../utils/cookies';
import { createCsrfCookieValue, extractCsrfToken } from '../../utils/csrf';

describe('Cookie and CSRF utilities', () => {
  it('should build and read a session cookie', () => {
    const cookie = buildCookie(SESSION_COOKIE_NAME, 'session-value', { httpOnly: true, expiresAt: new Date('2030-01-01T00:00:00Z') });
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=session-value`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(readCookie({ headers: { cookie: `${SESSION_COOKIE_NAME}=session-value; other=x` } } as any, SESSION_COOKIE_NAME)).toBe('session-value');
  });

  it('should return undefined for an absent cookie', () => {
    expect(readCookie({ headers: {} } as any, SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it('should expire a cookie', () => {
    expect(buildExpiredCookie(SESSION_COOKIE_NAME, { httpOnly: true })).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  });

  it('should create and validate a signed CSRF value', () => {
    const value = createCsrfCookieValue();
    const token = extractCsrfToken(value);
    expect(token).toBeTruthy();
    expect(value.startsWith(`${token}.`)).toBe(true);
  });

  it('should reject missing, malformed, and tampered CSRF values', () => {
    expect(extractCsrfToken()).toBeUndefined();
    expect(extractCsrfToken('invalid')).toBeUndefined();
    const value = createCsrfCookieValue();
    const [token] = value.split('.');
    expect(extractCsrfToken(`${token}.00`)).toBeUndefined();
    expect(extractCsrfToken(`${token}.${'0'.repeat(64)}`)).toBeUndefined();
  });

  it('should expose distinct cookie names', () => {
    expect(CSRF_COOKIE_NAME).not.toBe(SESSION_COOKIE_NAME);
  });
});