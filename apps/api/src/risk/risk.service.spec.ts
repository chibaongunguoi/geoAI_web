import { Test, TestingModule } from '@nestjs/testing';
import { RiskService } from './risk.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RiskService', () => {
  let service: RiskService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskService,
        {
          provide: PrismaService,
          useValue: {
            $queryRawUnsafe: jest.fn()
          }
        }
      ],
    }).compile();

    service = module.get<RiskService>(RiskService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return geojson feature collection', async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
      {
        id: '1',
        zoneType: 'flood',
        riskLevel: 'high',
        source: 'mock',
        description: 'test',
        geometry: { type: 'Polygon', coordinates: [] }
      }
    ]);

    const result = await service.getRiskZones('flood');
    
    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties.zoneType).toBe('flood');
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE "zoneType" = $1'),
      'flood'
    );
  });
});
