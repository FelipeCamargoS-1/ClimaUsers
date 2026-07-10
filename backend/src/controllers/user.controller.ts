import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from '../services/user.service';
import { CreateUserInput, ListUsersQuery, UpdateUserInput } from '../schemas/user.schema';

const userService = new UserService(new UserRepository());

export class UserController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.createUser(req.body as CreateUserInput);
      res.status(201).json({ success: true, message: 'Usuário cadastrado com sucesso', data: user, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.listUsers(req.query as unknown as ListUsersQuery);
      res.status(200).json({ success: true, message: 'Usuários listados com sucesso', data: result.users, pagination: result.pagination, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id);
      res.status(200).json({ success: true, message: 'Usuário encontrado com sucesso', data: user, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateUser(req.params.id, req.body as UpdateUserInput);
      res.status(200).json({ success: true, message: 'Usuário atualizado com sucesso', data: user, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) { next(error); }
  }
}

export const userController = new UserController();
