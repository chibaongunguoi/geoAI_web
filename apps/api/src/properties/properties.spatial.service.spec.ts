import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesSpatialService } from './properties.spatial.service';
import { PrismaService } from '../prisma/prisma.service';
import { BetterSqliteService } from '../prisma/better-sqlite.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PROPERTIES_SERVICE_OPTIONS } from './properties.types';

describe('PropertiesSpatialService (TDD Cache)', () => {
  let service: PropertiesSpatialService;
  let cacheManager: any;
  let sqliteService: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    sqliteService = {
      all: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesSpatialService,
        { provide: PrismaService, useValue: {} },
        { provide: BetterSqliteService, useValue: sqliteService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: PROPERTIES_SERVICE_OPTIONS, useValue: {} },
      ],
    }).compile();

    service = module.get<PropertiesSpatialService>(PropertiesSpatialService);
  });

  describe('getBuildingHeatmap', () => {
    it('should return from cache if available', async () => {
      const mockResult = { map: { type: 'property-density', regions: [] }, meta: { total: 1 } };
      cacheManager.get.mockResolvedValue(mockResult);

      const input = { gridSize: 100, limit: 1000, ward: 'Ward 1', district: 'District 1' };
      const result = await service.getBuildingHeatmap(input);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(sqliteService.all).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should calculate and set cache if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      sqliteService.all.mockReturnValue([]);

      const input = { gridSize: 100, limit: 1000, ward: 'Ward 1', district: 'District 1' };
      const result: any = await service.getBuildingHeatmap(input);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(sqliteService.all).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result.meta.total).toBe(0);
    });
  });
});
