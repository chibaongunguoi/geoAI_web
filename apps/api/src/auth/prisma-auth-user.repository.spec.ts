import { Test, TestingModule } from '@nestjs/testing';
import { PrismaAuthUserRepository } from './prisma-auth-user.repository';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('PrismaAuthUserRepository (TDD Cache)', () => {
  let repository: PrismaAuthUserRepository;
  let cacheManager: any;
  let prismaService: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    prismaService = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaAuthUserRepository,
        { provide: PrismaService, useValue: prismaService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    repository = module.get<PrismaAuthUserRepository>(PrismaAuthUserRepository);
  });

  describe('findByIdentifier', () => {
    it('should return from cache if available', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      cacheManager.get.mockResolvedValue(mockUser);

      const result = await repository.findByIdentifier('test@example.com');

      expect(cacheManager.get).toHaveBeenCalledWith('auth:identifier:test@example.com');
      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should query DB and set cache if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      const dbUser = {
        id: 'user-1',
        username: 'test',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hash',
        roles: [
          { role: { code: 'USER', permissions: [{ permission: { key: 'perm1' } }] } }
        ]
      };
      prismaService.user.findFirst.mockResolvedValue(dbUser);

      const result = await repository.findByIdentifier('test@example.com');

      expect(cacheManager.get).toHaveBeenCalledWith('auth:identifier:test@example.com');
      expect(prismaService.user.findFirst).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.id).toBe('user-1');
      expect(result?.permissions).toContain('perm1');
    });
  });

  describe('findById', () => {
    it('should return from cache if available', async () => {
      const mockUser = { id: 'user-2' };
      cacheManager.get.mockResolvedValue(mockUser);

      const result = await repository.findById('user-2');

      expect(cacheManager.get).toHaveBeenCalledWith('auth:id:user-2');
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should query DB and set cache if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      const dbUser = {
        id: 'user-2',
        username: 'test2',
        email: 'test2@example.com',
        name: 'Test2',
        passwordHash: 'hash',
        roles: []
      };
      prismaService.user.findUnique.mockResolvedValue(dbUser);

      const result = await repository.findById('user-2');

      expect(cacheManager.get).toHaveBeenCalledWith('auth:id:user-2');
      expect(prismaService.user.findUnique).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result?.id).toBe('user-2');
    });
  });
});
