import { PropertiesSearchService } from "./properties.search.service";

describe("PropertiesSearchService natural language search", () => {
  function serviceWith(overrides: {
    groq?: any;
    prisma?: any;
    spatial?: any;
  } = {}) {
    const prisma = overrides.prisma || {
      $queryRawUnsafe: jest
        .fn()
        .mockResolvedValueOnce([
          { id: "ref-1", name: "Nhat Minh Academy", category: "school", lat: 16.067, lng: 108.22 }
        ])
        .mockResolvedValueOnce([
          {
            id: "hotel-1",
            name: "Khach san Hai Chau",
            category: "hotel",
            address: "Hai Chau",
            centroidLat: 16.068,
            centroidLng: 108.221,
            distance: 180
          }
        ]),
      buildingProperty: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const spatial = overrides.spatial || {
      locationNames: jest.fn(() => ({
        wards: new Map([
          ["thach thang", "Thạch Thang"],
          ["hai chau i", "Hải Châu I"],
          ["hai chau ii", "Hải Châu II"]
        ]),
        districts: new Map([["hai chau", "Hải Châu"]])
      })),
      densityLocationFilters: jest.fn((intent) => intent.filters),
      densityRegions: jest.fn().mockResolvedValue([]),
      densityTotal: jest.fn().mockResolvedValue(0),
      densityFallbackResponse: jest.fn()
    };
    const groq = overrides.groq || {
      parsePropertyQuery: jest.fn().mockResolvedValue({
        intent: "relational_spatial",
        targetCategory: "hotel",
        referenceName: "Nhat Minh Academy",
        distanceMeters: 500,
        district: "Hải Châu",
        ward: null
      })
    };

    return {
      service: new PropertiesSearchService(prisma, spatial, groq),
      prisma,
      spatial,
      groq
    };
  }

  it("routes Vietnamese relational spatial queries through Groq intent", async () => {
    const { service, groq } = serviceWith();

    const result = await service.searchProperties({
      query: "Tìm khách sạn gần Nhat Minh Academy",
      limit: 5
    });

    expect(groq.parsePropertyQuery).toHaveBeenCalledWith("Tìm khách sạn gần Nhat Minh Academy");
    expect(result.meta.searchMode).toBe("spatial-relational");
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "hotel-1",
        propertyType: "hotel",
        distance: 180
      })
    ]);
  });

  it("routes risk queries to spatial intersects within Hai Chau", async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          id: "school-1",
          name: "Truong Hai Chau",
          category: "school",
          address: "Hai Chau",
          centroidLat: 16.07,
          centroidLng: 108.22
        }
      ]),
      buildingProperty: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const { service } = serviceWith({
      prisma,
      groq: {
        parsePropertyQuery: jest.fn().mockResolvedValue({
          intent: "risk",
          targetCategory: "school",
          district: "Hải Châu",
          riskType: "flood",
          searchTerms: ["truong hoc"]
        })
      }
    });

    const result = await service.searchProperties({
      query: "Các trường học dễ bị ngập lụt ở Hải Châu",
      limit: 5
    });

    expect(result.meta.searchMode).toBe("spatial-risk");
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "school-1",
        propertyType: "school"
      })
    ]);
  });

  it("routes density queries with many plus category through Groq terms", async () => {
    const densityRegions = [
      {
        id: "cell-1",
        label: "Thạch Thang, Hải Châu",
        count: 4,
        center: { lat: 16.07, lng: 108.22 },
        bbox: { south: 16.069, west: 108.219, north: 16.071, east: 108.221 },
        ward: "Thạch Thang",
        district: "Hải Châu",
        objects: []
      }
    ];
    const spatial = {
      locationNames: jest.fn(() => ({
        wards: new Map([["thach thang", "Thạch Thang"]]),
        districts: new Map([["hai chau", "Hải Châu"]])
      })),
      densityLocationFilters: jest.fn((intent) => intent.filters),
      densityRegions: jest.fn().mockResolvedValue(densityRegions),
      densityTotal: jest.fn().mockResolvedValue(4),
      densityFallbackResponse: jest.fn()
    };
    const { service } = serviceWith({
      spatial,
      groq: {
        parsePropertyQuery: jest.fn().mockResolvedValue({
          intent: "density",
          targetCategory: "school",
          district: "Hải Châu",
          direction: "highest",
          searchTerms: ["truong hoc"]
        })
      }
    });

    const result = await service.searchProperties({
      query: "Khu vực có nhiều trường học ở Hải Châu",
      limit: 5
    });

    expect(spatial.densityRegions).toHaveBeenCalledWith(
      expect.objectContaining({ type: "density", direction: "highest" }),
      ["truong", "hoc"],
      expect.any(Number),
      "overture",
      expect.objectContaining({ district: "Hải Châu" }),
      ["truong", "hoc"]
    );
    expect(result.map.type).toBe("property-density");
    expect(result.meta.searchMode).toBe("postgres-normalized-vietnamese-nl-fuzzy-density");
  });

  it("routes count queries through Groq and keeps Hai Chau scope", async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      buildingProperty: {
        count: jest.fn().mockResolvedValue(7),
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const { service } = serviceWith({
      prisma,
      groq: {
        parsePropertyQuery: jest.fn().mockResolvedValue({
          intent: "count",
          targetCategory: "building",
          district: "Hải Châu",
          searchTerms: ["toa nha"]
        })
      }
    });

    const result = await service.searchProperties({
      query: "Có bao nhiêu tòa nhà ở quận Hải Châu?",
      limit: 5
    });

    expect(prisma.buildingProperty.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          propertyType: "building"
        })
      })
    );
    expect(result.answer.count).toBe(7);
    expect(result.meta.searchMode).toBe("postgres-normalized-vietnamese-nl");
  });

  it("falls back to count instead of density when Groq is unavailable for bao nhieu queries", async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      buildingProperty: {
        count: jest.fn().mockResolvedValue(12),
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const { service, spatial } = serviceWith({
      prisma,
      groq: {
        parsePropertyQuery: jest.fn().mockResolvedValue({ intent: "unknown" })
      }
    });

    const result = await service.searchProperties({
      query: "Có bao nhiêu tòa nhà ở quận Hải Châu?",
      source: "all",
      limit: 5
    });

    expect(spatial.densityRegions).not.toHaveBeenCalled();
    expect(result.answer.type).toBe("count");
    expect(result.answer.count).toBe(12);
    expect(result.answer.filters).toEqual({ district: "Hải Châu", ward: undefined });
  });

  it("returns a scoped warning for districts outside Hai Chau", async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn(),
      buildingProperty: {
        count: jest.fn(),
        findMany: jest.fn()
      }
    };
    const { service } = serviceWith({
      prisma,
      groq: {
        parsePropertyQuery: jest.fn().mockResolvedValue({
          intent: "count",
          targetCategory: "hospital",
          district: "Thanh Khê",
          searchTerms: ["benh vien"]
        })
      }
    });

    const result = await service.searchProperties({
      query: "Có bao nhiêu bệnh viện ở quận Thanh Khê?",
      limit: 5
    });

    expect(result.items).toEqual([]);
    expect(result.meta.searchMode).toBe("llm-intent-out-of-scope");
    expect(prisma.buildingProperty.count).not.toHaveBeenCalled();
  });
});
