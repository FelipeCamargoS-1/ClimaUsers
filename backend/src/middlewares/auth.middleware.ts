import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { CSRF_COOKIE_NAME, readCookie, SESSION_COOKIE_NAME } from '../utils/cookies';
import { extractCsrfToken } from '../utils/csrf';

const authService = new AuthService(new UserRepository());

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getSessionUser(readCookie(req, SESSION_COOKIE_NAME));
    if (!user) {
      res.status(401).json({ success: false, message: 'Não autenticado', timestamp: new Date().toISOString() });
      return;
    }

    Object.assign(req, { authUser: user });
    next();
  } catch (error) {
    next(error);
  }
}

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const csrfCookieValue = readCookie(req, CSRF_COOKIE_NAME);
  const csrfCookieToken = extractCsrfToken(csrfCookieValue);
  const csrfHeaderToken = req.header('x-csrf-token');

  if (!csrfCookieToken || !csrfHeaderToken || csrfCookieToken !== csrfHeaderToken) {
    res.status(403).json({ success: false, message: 'Falha na validação CSRF', timestamp: new Date().toISOString() });
    return;
  }

  next();
}
