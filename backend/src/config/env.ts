import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  WEATHER_API_KEY: z.string().optional().default(''),
  FRONTEND_ORIGIN: z.string().default('http://localhost:8080'),
  AUTH_PEPPER: z.string().default('change-this-auth-pepper'),
  CSRF_SECRET: z.string().default('change-this-csrf-secret'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
