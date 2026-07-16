import { prisma } from '../config/database';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface IUserRepository {
  create(data: { name: string; email: string }): Promise<PublicUser>;
  findById(id: string): Promise<PublicUser | null>;
  findByEmail(email: string): Promise<PublicUser | null>;
  update(id: string, data: { name?: string; email?: string }): Promise<PublicUser>;
  delete(id: string): Promise<PublicUser>;
  findAll(params: { skip: number; take: number; orderBy: Record<string, 'asc' | 'desc'>; where?: Record<string, unknown> }): Promise<{ users: PublicUser[]; total: number }>;
}

export class UserRepository implements IUserRepository {
  create(data: { name: string; email: string }): Promise<PublicUser> {
    return prisma.user.create({ data, select: publicUserSelect });
  }

  findById(id: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  }

  findByEmail(email: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({ where: { email }, select: publicUserSelect });
  }

  update(id: string, data: { name?: string; email?: string }): Promise<PublicUser> {
    return prisma.user.update({ where: { id }, data, select: publicUserSelect });
  }

  delete(id: string): Promise<PublicUser> {
    return prisma.user.delete({ where: { id }, select: publicUserSelect });
  }

  async findAll(params: { skip: number; take: number; orderBy: Record<string, 'asc' | 'desc'>; where?: Record<string, unknown> }): Promise<{ users: PublicUser[]; total: number }> {
    const [users, total] = await Promise.all([
      prisma.user.findMany({ skip: params.skip, take: params.take, orderBy: params.orderBy, where: params.where, select: publicUserSelect }),
      prisma.user.count({ where: params.where }),
    ]);
    return { users, total };
  }
}
