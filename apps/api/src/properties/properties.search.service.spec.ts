import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesSearchService } from './properties.search.service';
import { PrismaService } from '../prisma/prisma.service';
import { BetterSqliteService } from '../prisma/better-sqlite.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PROPERTIES_SERVICE_OPTIONS } from './properties.types';
import { PropertiesSpatialService } from './properties.spatial.service';

describe('PropertiesSearchService (TDD Cache)', () => {
  let service: PropertiesSearchService;
  let cacheManager: any;
  let prismaService: any;
  let spatialService: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    prismaService = {
      buildingProperty: {
        findMany: jest.fn(),
        count: jest.fn(),
      }
    };

    spatialService = {
      densityLocationFilters: jest.fn().mockReturnValue({}),
      densityRegions: jest.fn().mockResolvedValue([]),
      densityTotal: jest.fn().mockResolvedValue(0),
      densityFallbackResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesSearchService,
        { provide: PrismaService, useValue: prismaService },
        { provide: BetterSqliteService, useValue: {} },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: PROPERTIES_SERVICE_OPTIONS, useValue: {} },
        { provide: PropertiesSpatialService, useValue: spatialService },
      ],
    }).compile();

    service = module.get<PropertiesSearchService>(PropertiesSearchService);
  });

  describe('searchProperties', () => {
    it('should return from cache if available', async () => {
      const mockResult = { items: [], meta: { total: 10 } };
      cacheManager.get.mockResolvedValue(mockResult);

      const input = { query: 'test' };
      const result = await service.searchProperties(input);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(prismaService.buildingProperty.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });
});
