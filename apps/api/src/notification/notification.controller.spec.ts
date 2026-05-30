import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: any;

  beforeEach(async () => {
    notificationService = {
      getNotifications: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: notificationService },
        { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  describe('getNotifications', () => {
    it('should call getNotifications on service', async () => {
      const mockResult = [{ id: '1' }];
      notificationService.getNotifications.mockResolvedValue(mockResult);

      const req = { user: { id: 'user-1' } };
      const result = await controller.getNotifications(req);

      expect(notificationService.getNotifications).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getUnreadCount', () => {
    it('should call getUnreadCount on service', async () => {
      notificationService.getUnreadCount.mockResolvedValue(3);

      const req = { user: { id: 'user-1' } };
      const result = await controller.getUnreadCount(req);

      expect(notificationService.getUnreadCount).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ unreadCount: 3 });
    });
  });

  describe('markAsRead', () => {
    it('should call markAsRead on service', async () => {
      const mockResult = { id: '1', isRead: true };
      notificationService.markAsRead.mockResolvedValue(mockResult);

      const req = { user: { id: 'user-1' } };
      const result = await controller.markAsRead('1', req);

      expect(notificationService.markAsRead).toHaveBeenCalledWith('1', 'user-1');
      expect(result).toEqual(mockResult);
    });
  });
});
