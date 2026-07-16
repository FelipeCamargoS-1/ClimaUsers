import { z } from 'zod';

export const authRegisterSchema = z.object({
  name: z.string({ required_error: 'O nome é obrigatório' }).min(3, 'O nome deve ter no mínimo 3 caracteres').max(255).trim(),
  email: z.string({ required_error: 'O e-mail é obrigatório' }).email('Formato de e-mail inválido').max(255).trim().toLowerCase(),
  password: z
    .string({ required_error: 'A senha é obrigatória' })
    .min(12, 'A senha deve ter no mínimo 12 caracteres')
    .max(128, 'A senha deve ter no máximo 128 caracteres'),
});

export const authLoginSchema = z.object({
  email: z.string({ required_error: 'O e-mail é obrigatório' }).email('Formato de e-mail inválido').max(255).trim().toLowerCase(),
  password: z.string({ required_error: 'A senha é obrigatória' }).min(1, 'A senha é obrigatória').max(128, 'A senha deve ter no máximo 128 caracteres'),
});

export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
