import { UserService } from '../../services/user.service';
import { IUserRepository } from '../../repositories/user.repository';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { User } from '@prisma/client';

describe('UserService Unit Tests', () => {
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let userService: UserService;

  const mockUser: User = {
    id: 'uuid-123456',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    userService = new UserService(mockUserRepository);
  });

  describe('updateUser', () => {
    it('should update an existing user', async () => {
      const updatedUser = { ...mockUser, name: 'Updated User' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(mockUser.id, { name: 'Updated User' });

      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, { name: 'Updated User' });
      expect(result).toEqual(updatedUser);
    });

    it('should reject an email used by another user', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue({ ...mockUser, id: 'another-id' });

      await expect(userService.updateUser(mockUser.id, { email: 'used@example.com' })).rejects.toThrow(ConflictError);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should map a concurrent unique-email violation to ConflictError', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockRejectedValue({ code: 'P2002' });

      await expect(userService.updateUser(mockUser.id, { email: 'used@example.com' })).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteUser', () => {
    it('should delete an existing user', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(mockUser);

      await userService.deleteUser(mockUser.id);

      expect(mockUserRepository.delete).toHaveBeenCalledWith(mockUser.id);
    });

    it('should reject deletion when the user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteUser(mockUser.id)).rejects.toThrow(NotFoundError);
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully if email is unique', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await userService.createUser({
        name: 'Test User',
        email: 'test@example.com',
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictError if email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        userService.createUser({
          name: 'Another User',
          email: 'test@example.com',
        })
      ).rejects.toThrow(ConflictError);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should map a concurrent unique-email violation to ConflictError', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        userService.createUser({ name: 'Another User', email: 'test@example.com' }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getUserById', () => {
    it('should return a user if they exist', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('uuid-123456');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('uuid-123456');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundError if user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById('uuid-non-existent')).rejects.toThrow(NotFoundError);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('uuid-non-existent');
    });
  });

  describe('listUsers', () => {
    it('should return users list and pagination metadata', async () => {
      mockUserRepository.findAll.mockResolvedValue({
        users: [mockUser],
        total: 1,
      });

      const query = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };

      const result = await userService.listUsers(query);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {},
      });
      expect(result.users).toEqual([mockUser]);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      });
    });

    it('should apply filters dynamically when name, email, or search is provided', async () => {
      mockUserRepository.findAll.mockResolvedValue({
        users: [],
        total: 0,
      });

      const query = {
        page: 2,
        limit: 5,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
        name: 'Alice',
        email: 'alice@',
        search: 'keyword',
      };

      await userService.listUsers(query);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { name: 'asc' },
        where: {
          name: { contains: 'Alice' },
          email: { contains: 'alice@' },
          OR: [
            { name: { contains: 'keyword' } },
            { email: { contains: 'keyword' } },
          ],
        },
      });
    });
  });
});
