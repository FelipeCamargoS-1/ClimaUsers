import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './utils/logger';
import { rateLimiter } from './middlewares/rate-limit.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import routes from './routes';
import { setupSwagger } from './swagger';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: { write: (message) => logger.http(message.trim()) } }));
  app.use('/api', rateLimiter);
  app.use('/api', routes);
  setupSwagger(app);
  app.use(errorMiddleware);
  return app;
}

export default createApp();
