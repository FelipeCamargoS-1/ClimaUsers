import { CreateUserInput, ListUsersQuery, UpdateUserInput } from '../schemas/user.schema';
import { IUserRepository, PublicUser } from '../repositories/user.repository';
import { ConflictError, NotFoundError } from '../utils/errors';

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  async createUser(data: CreateUserInput): Promise<PublicUser> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) throw new ConflictError('Este e-mail já está sendo utilizado por outro usuário');
    try {
      return await this.userRepository.create(data);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictError('Este e-mail já está sendo utilizado por outro usuário');
      }
      throw error;
    }
  }

  async getUserById(id: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError('Usuário não encontrado');
    return user;
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<PublicUser> {
    await this.getUserById(id);
    if (data.email) {
      const userWithEmail = await this.userRepository.findByEmail(data.email);
      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictError('Este e-mail já está sendo utilizado por outro usuário');
      }
    }
    try {
      return await this.userRepository.update(id, data);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictError('Este e-mail já está sendo utilizado por outro usuário');
      }
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    await this.getUserById(id);
    await this.userRepository.delete(id);
  }

  async listUsers(query: ListUsersQuery) {
    const where: Record<string, unknown> = {};
    if (query.name) where.name = { contains: query.name };
    if (query.email) where.email = { contains: query.email };
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const { users, total } = await this.userRepository.findAll({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { [query.sortBy]: query.sortOrder },
      where,
    });

    return { users, pagination: { total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) } };
  }
}
