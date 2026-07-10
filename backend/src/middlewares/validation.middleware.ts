import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { ValidationError } from '../utils/errors';

export const validate = (schema: ZodTypeAny, type: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req[type] = await schema.parseAsync(req[type]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Campos inválidos ou obrigatórios ausentes', error.errors.map((err) => ({ field: err.path.join('.'), message: err.message }))));
        return;
      }
      next(error);
    }
  };
};
