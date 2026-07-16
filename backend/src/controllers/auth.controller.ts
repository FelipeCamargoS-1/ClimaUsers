import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { buildCookie, buildExpiredCookie, CSRF_COOKIE_NAME, readCookie, SESSION_COOKIE_NAME } from '../utils/cookies';
import { createCsrfCookieValue } from '../utils/csrf';

const authService = new AuthService(new UserRepository());

function serializeSessionCookie(token: string, expiresAt: Date) {
  return buildCookie(SESSION_COOKIE_NAME, token, { httpOnly: true, expiresAt });
}

function serializeCsrfCookie(expiresAt: Date) {
  return buildCookie(CSRF_COOKIE_NAME, createCsrfCookieValue(), { expiresAt });
}

function clearCookies() {
  return [buildExpiredCookie(SESSION_COOKIE_NAME, { httpOnly: true }), buildExpiredCookie(CSRF_COOKIE_NAME)];
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.setHeader('Set-Cookie', [serializeSessionCookie(result.rawToken, result.expiresAt), serializeCsrfCookie(result.expiresAt)]);
      res.status(201).json({ success: true, message: 'Conta criada com sucesso', data: result.user, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      res.setHeader('Set-Cookie', [serializeSessionCookie(result.rawToken, result.expiresAt), serializeCsrfCookie(result.expiresAt)]);
      res.status(200).json({ success: true, message: 'Login realizado com sucesso', data: result.user, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(readCookie(req, SESSION_COOKIE_NAME));
      res.setHeader('Set-Cookie', clearCookies());
      res.status(200).json({ success: true, message: 'Sessão encerrada com sucesso', data: null, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionToken = readCookie(req, SESSION_COOKIE_NAME);
      const user = await authService.getSessionUser(sessionToken);
      if (!user) {
        res.status(401).json({ success: false, message: 'Não autenticado', timestamp: new Date().toISOString() });
        return;
      }
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      res.setHeader('Set-Cookie', serializeCsrfCookie(expiresAt));
      res.status(200).json({ success: true, message: 'Sessão ativa', data: user, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
