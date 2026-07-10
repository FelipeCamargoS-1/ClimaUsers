import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const errorMiddleware = (error: Error, req: Request, res: Response, _next: NextFunction): void => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'Erro interno do servidor';
  const errors = error instanceof AppError ? error.errors : undefined;

  if (statusCode >= 500) logger.error(`${req.method} ${req.url} - ${error.stack}`);
  else logger.warn(`${req.method} ${req.url} - ${message}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: error.stack } : {}),
    timestamp: new Date().toISOString(),
  });
};
