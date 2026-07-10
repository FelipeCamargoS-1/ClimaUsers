import { Prisma, User } from '@prisma/client';
import { CreateUserInput, ListUsersQuery, UpdateUserInput } from '../schemas/user.schema';
import { IUserRepository } from '../repositories/user.repository';
import { ConflictError, NotFoundError } from '../utils/errors';

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async createUser(data: CreateUserInput): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) throw new ConflictError('Este e-mail já está sendo utilizado por outro usuário');
    return this.userRepository.create(data);
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError('Usuário não encontrado');
    return user;
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    await this.getUserById(id);
    if (data.email) {
      const userWithEmail = await this.userRepository.findByEmail(data.email);
      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictError('Este e-mail já está sendo utilizado por outro usuário');
      }
    }
    return this.userRepository.update(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    await this.getUserById(id);
    await this.userRepository.delete(id);
  }

  async listUsers(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {};
    if (query.name) where.name = { contains: query.name };
    if (query.email) where.email = { contains: query.email };
    if (query.search) where.OR = [{ name: { contains: query.search } }, { email: { contains: query.search } }];

    const { users, total } = await this.userRepository.findAll({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { [query.sortBy]: query.sortOrder },
      where,
    });

    return { users, pagination: { total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) } };
  }
}

