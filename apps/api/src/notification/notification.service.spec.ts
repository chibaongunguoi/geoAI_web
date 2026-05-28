import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const mockResult = { id: '1', userId: 'user-1', title: 'Test', message: 'Msg', type: 'INFO', isRead: false };
      prismaService.notification.create.mockResolvedValue(mockResult);

      const result = await service.createNotification('user-1', 'Test', 'Msg', 'INFO');

      expect(prismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Test',
          message: 'Msg',
          type: 'INFO',
          isRead: false
        }
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getNotifications', () => {
    it('should return a list of notifications', async () => {
      const mockList = [{ id: '1' }, { id: '2' }];
      prismaService.notification.findMany.mockResolvedValue(mockList);

      const result = await service.getNotifications('user-1');

      expect(prismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      prismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(prismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false }
      });
      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockResult = { id: '1', isRead: true };
      prismaService.notification.update.mockResolvedValue(mockResult);

      const result = await service.markAsRead('1', 'user-1');

      expect(prismaService.notification.update).toHaveBeenCalledWith({
        where: { id: '1', userId: 'user-1' },
        data: { isRead: true }
      });
      expect(result).toEqual(mockResult);
    });
  });
});
