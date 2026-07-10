import { Prisma, User } from '@prisma/client';
import { prisma } from '../config/database';

export interface IUserRepository {
  create(data: Prisma.UserCreateInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  delete(id: string): Promise<User>;
  findAll(params: { skip: number; take: number; orderBy: Prisma.UserOrderByWithRelationInput; where?: Prisma.UserWhereInput }): Promise<{ users: User[]; total: number }>;
}

export class UserRepository implements IUserRepository {
  create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } });
  }

  async findAll(params: { skip: number; take: number; orderBy: Prisma.UserOrderByWithRelationInput; where?: Prisma.UserWhereInput }): Promise<{ users: User[]; total: number }> {
    const [users, total] = await Promise.all([
      prisma.user.findMany({ skip: params.skip, take: params.take, orderBy: params.orderBy, where: params.where }),
      prisma.user.count({ where: params.where }),
    ]);
    return { users, total };
  }
}
