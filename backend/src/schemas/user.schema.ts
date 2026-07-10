import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string({ required_error: 'O nome é obrigatório' }).min(3, 'O nome deve ter no mínimo 3 caracteres').max(255).trim(),
  email: z.string({ required_error: 'O e-mail é obrigatório' }).email('Formato de e-mail inválido').max(255).trim().toLowerCase(),
});

export const updateUserSchema = createUserSchema.partial().refine(
  (data) => data.name !== undefined || data.email !== undefined,
  { message: 'Informe ao menos um campo para atualização' },
);

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  name: z.string().optional(),
  email: z.string().optional(),
  search: z.string().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('ID inválido. Deve ser um UUID válido.'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
