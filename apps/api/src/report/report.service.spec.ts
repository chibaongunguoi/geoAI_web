import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
describe('ReportService', () => {
  let service: ReportService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    report: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    it('should create a new report', async () => {
      const data = { reason: 'Test', message: 'Test message', latitude: 10, longitude: 20 };
      const expectedResult = { id: '1', userId: 'user1', status: 'PENDING', ...data };
      mockPrismaService.report.create.mockResolvedValue(expectedResult);

      const result = await service.createReport('user1', data);
      expect(mockPrismaService.report.create).toHaveBeenCalledWith({
        data: { ...data, userId: 'user1', status: 'PENDING' },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getReports', () => {
    it('should return only user reports if user is citizen', async () => {
      mockPrismaService.report.findMany.mockResolvedValue([]);
      const user = { id: 'citizen1', roles: ['CITIZEN'] };
      
      await service.getReports(user);
      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith({
        where: { userId: 'citizen1' },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } }
      });
    });

    it('should return all reports if user is officer', async () => {
      mockPrismaService.report.findMany.mockResolvedValue([]);
      const user = { id: 'officer1', roles: ['OFFICER'] };
      
      await service.getReports(user, 'PENDING');
      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } }
      });
    });
  });

  describe('respondToReport', () => {
    it('should update status to RESPONDED and add message', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({ id: '1' });
      mockPrismaService.report.update.mockResolvedValue({ id: '1', status: 'RESPONDED', responseMessage: 'Ok' });

      const result = await service.respondToReport('1', 'Ok');
      expect(mockPrismaService.report.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'RESPONDED', responseMessage: 'Ok' }
      });
      expect(result.status).toBe('RESPONDED');
    });

    it('should throw if report not found', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(null);
      await expect(service.respondToReport('2', 'Ok')).rejects.toThrow('Report not found');
    });
  });

  describe('resolveReport', () => {
    it('should update status to RESOLVED if creator', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({ id: '1', userId: 'user1' });
      mockPrismaService.report.update.mockResolvedValue({ id: '1', status: 'RESOLVED' });

      await service.resolveReport('1', 'user1', false);
      expect(mockPrismaService.report.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'RESOLVED' }
      });
    });

    it('should update status to RESOLVED if officer', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({ id: '1', userId: 'user1' });
      mockPrismaService.report.update.mockResolvedValue({ id: '1', status: 'RESOLVED' });

      await service.resolveReport('1', 'officer1', true);
      expect(mockPrismaService.report.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'RESOLVED' }
      });
    });

    it('should throw if neither creator nor officer', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({ id: '1', userId: 'user1' });
      await expect(service.resolveReport('1', 'other_user', false)).rejects.toThrow('Không có quyền đóng phản ánh này.');
    });

    it('should notify managers when user resolves a report', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({ id: '1', userId: 'user1', reason: 'Test' });
      mockPrismaService.report.update.mockResolvedValue({ id: '1', status: 'RESOLVED' });
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 'manager1' }]);

      await service.resolveReport('1', 'user1', false);
      
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        'manager1',
        'Sự cố đã đóng',
        'Người dân đã đóng sự cố: Test',
        'REPORT_RESOLVED'
      );
    });
  });

  describe('receiveReport', () => {
    it('should update status to RECEIVED and notify user', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({ id: '1', userId: 'user1', reason: 'Test' });
      mockPrismaService.report.update.mockResolvedValue({ id: '1', status: 'RECEIVED' });

      const result = await service.receiveReport('1', true);
      
      expect(mockPrismaService.report.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'RECEIVED' }
      });
      expect(result.status).toBe('RECEIVED');
    });

    it('should throw if not officer or admin', async () => {
      await expect(service.receiveReport('1', false)).rejects.toThrow('Không có quyền tiếp nhận.');
    });
  });
});
