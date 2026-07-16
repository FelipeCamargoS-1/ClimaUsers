import crypto from 'crypto';
import { promisify } from 'util';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { UserRepository } from '../repositories/user.repository';
import { AppError, ConflictError } from '../utils/errors';
import type { AuthLoginInput, AuthRegisterInput } from '../schemas/auth.schema';

const scrypt = promisify(crypto.scrypt);

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(data: AuthRegisterInput) {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) throw new ConflictError('Este e-mail já está sendo utilizado por outro usuário');

    const passwordHash = await this.hashPassword(data.password);
    const userId = crypto.randomUUID();
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
       VALUES ($1::uuid, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, name, email, created_at AS "createdAt", updated_at AS "updatedAt"`,
      userId,
      data.name,
      data.email,
      passwordHash,
    );
    const user = (rows as SessionUser[])[0];

    return this.createSessionForUser(user);
  }

  async login(data: AuthLoginInput) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, name, email, password_hash AS "passwordHash", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users
       WHERE email = $1
       LIMIT 1`,
      data.email,
    );
    const user = (rows as Array<SessionUser & { passwordHash: string | null }>)[0];
    const invalid = new AppError('Credenciais inválidas', 401);

    if (!user?.passwordHash) throw invalid;
    const isValid = await this.verifyPassword(data.password, user.passwordHash);
    if (!isValid) throw invalid;

    return this.createSessionForUser(user);
  }

  async getSessionUser(rawToken: string | undefined): Promise<SessionUser | null> {
    if (!rawToken) return null;

    const tokenHash = this.hashSessionToken(rawToken);
    const rows = await prisma.$queryRawUnsafe(
      `SELECT s.id AS "sessionId", s.expires_at AS "expiresAt",
              u.id, u.name, u.email, u.created_at AS "createdAt", u.updated_at AS "updatedAt"
       FROM auth_sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1
       LIMIT 1`,
      tokenHash,
    );
    const session = (rows as Array<SessionUser & { sessionId: string; expiresAt: Date }>)[0];

    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.$executeRawUnsafe(`DELETE FROM auth_sessions WHERE token_hash = $1`, tokenHash).catch(() => undefined);
      return null;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE auth_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = $1`,
      tokenHash,
    ).catch(() => undefined);

    return {
      id: session.id,
      name: session.name,
      email: session.email,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const tokenHash = this.hashSessionToken(rawToken);
    await prisma.$executeRawUnsafe(`DELETE FROM auth_sessions WHERE token_hash = $1`, tokenHash);
  }

  private async createSessionForUser(user: SessionUser) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);
    const sessionId = crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      `INSERT INTO auth_sessions (id, token_hash, user_id, expires_at, created_at, last_seen_at)
       VALUES ($1::uuid, $2, $3::uuid, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      sessionId,
      tokenHash,
      user.id,
      expiresAt,
    );

    return { user, rawToken, expiresAt };
  }

  private async hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = (await scrypt(`${password}${env.AUTH_PEPPER}`, salt, 64)) as Buffer;
    return `scrypt:${salt}:${derived.toString('hex')}`;
  }

  private async verifyPassword(password: string, storedHash: string) {
    const [algorithm, salt, hashHex] = storedHash.split(':');
    if (algorithm !== 'scrypt' || !salt || !hashHex) return false;

    const derived = (await scrypt(`${password}${env.AUTH_PEPPER}`, salt, 64)) as Buffer;
    const stored = Buffer.from(hashHex, 'hex');
    return stored.length === derived.length && crypto.timingSafeEqual(stored, derived);
  }

  private hashSessionToken(rawToken: string) {
    return crypto.createHash('sha256').update(`${rawToken}:${env.AUTH_PEPPER}`).digest('hex');
  }
}
