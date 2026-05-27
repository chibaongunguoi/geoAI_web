import { Test, TestingModule } from '@nestjs/testing';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('ReportController', () => {
  let controller: ReportController;
  let service: ReportService;

  const mockReportService = {
    createReport: jest.fn(),
    getReports: jest.fn(),
    respondToReport: jest.fn(),
    resolveReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        { provide: ReportService, useValue: mockReportService },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<ReportController>(ReportController);
    service = module.get<ReportService>(ReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createReport', () => {
    it('should call service.createReport with correct userId', async () => {
      const mockReq = { user: { sub: 'user1' } };
      const body = { reason: 'Test', message: 'Test message', latitude: 10, longitude: 20 };
      mockReportService.createReport.mockResolvedValue({ id: '1', ...body });

      const result = await controller.createReport(mockReq, body);
      expect(mockReportService.createReport).toHaveBeenCalledWith('user1', body);
      expect(result.id).toBe('1');
    });
  });

  describe('getReports', () => {
    it('should call service.getReports with correct parameters', async () => {
      const mockReq = { user: { id: 'user1', roles: ['CITIZEN'] } };
      mockReportService.getReports.mockResolvedValue([]);

      await controller.getReports(mockReq, 'PENDING');
      expect(mockReportService.getReports).toHaveBeenCalledWith(mockReq.user, 'PENDING');
    });
  });

  describe('respondToReport', () => {
    it('should throw error if user is not officer or admin', async () => {
      const mockReq = { user: { roles: ['CITIZEN'] } };
      await expect(controller.respondToReport(mockReq, '1', { responseMessage: 'Ok' }))
        .rejects.toThrow('Không có quyền phản hồi.');
    });

    it('should call service.respondToReport if user is officer', async () => {
      const mockReq = { user: { roles: ['OFFICER'] } };
      mockReportService.respondToReport.mockResolvedValue({ id: '1', status: 'RESPONDED' });

      await controller.respondToReport(mockReq, '1', { responseMessage: 'Ok' });
      expect(mockReportService.respondToReport).toHaveBeenCalledWith('1', 'Ok');
    });
  });

  describe('resolveReport', () => {
    it('should call service.resolveReport with correct flags', async () => {
      const mockReq = { user: { sub: 'user1', roles: ['CITIZEN'] } };
      mockReportService.resolveReport.mockResolvedValue({ id: '1', status: 'RESOLVED' });

      await controller.resolveReport(mockReq, '1');
      expect(mockReportService.resolveReport).toHaveBeenCalledWith('1', 'user1', false);
    });

    it('should set isOfficerOrAdmin to true if user has admin role', async () => {
      const mockReq = { user: { sub: 'admin1', roles: ['ADMIN'] } };
      mockReportService.resolveReport.mockResolvedValue({ id: '1', status: 'RESOLVED' });

      await controller.resolveReport(mockReq, '1');
      expect(mockReportService.resolveReport).toHaveBeenCalledWith('1', 'admin1', true);
    });
  });
});
