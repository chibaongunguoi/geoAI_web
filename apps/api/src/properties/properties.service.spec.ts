import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PropertiesService } from "./properties.service";

function prismaStub(overrides = {}) {
  return {
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    buildingProperty: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    auditLog: {
      create: jest.fn()
    },
    ...overrides
  };
}

const propertyRow = {
  id: "property-1",
  code: "DN-BLD-000001",
  name: "Nha Nguyen Luong Bang",
  addressLine: "546 Nguyen Luong Bang",
  street: "Nguyen Luong Bang",
  ward: "Hoa Khanh Bac",
  district: "Lien Chieu",
  city: "Da Nang",
  propertyType: "building",
  status: "ACTIVE",
  source: "overture",
  centroidLat: 16.071,
  centroidLng: 108.15,
  searchTextNormalized: "nha nguyen luong bang hoa khanh bac lien chieu da nang",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-01T00:00:00.000Z")
};

describe("PropertiesService", () => {
  it("searches Vietnamese natural-language property queries with accent-insensitive tokens", async () => {
    const prisma = prismaStub({
      buildingProperty: {
        findMany: jest.fn().mockResolvedValue([
          propertyRow,
          {
            ...propertyRow,
            id: "property-2",
            street: "Le Duan",
            ward: "Hai Chau",
            searchTextNormalized: "nha le duan hai chau da nang"
          }
        ]),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn()
      }
    });
    const service = new PropertiesService(prisma);

    const result = await service.searchProperties({
      query: "Cho toi danh sach cac can nha o duong Nguyen Luong Bang tai Phuong Hoa Khanh",
      limit: 10
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("property-1");
    expect(result.meta.tokens).toEqual(
      expect.arrayContaining(["nguyen", "luong", "bang", "hoa", "khanh"])
    );
    expect(prisma.buildingProperty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          AND: expect.arrayContaining([
            { searchTextNormalized: { contains: "nguyen" } },
            { searchTextNormalized: { contains: "luong" } },
            { searchTextNormalized: { contains: "bang" } },
            { searchTextNormalized: { contains: "hoa" } },
            { searchTextNormalized: { contains: "khanh" } }
          ])
        }),
        take: 25
      })
    );
  });

  it("answers Vietnamese ward and district building count questions", async () => {
    const prisma = prismaStub({
      buildingProperty: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(14300),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn()
      }
    });
    const service = new PropertiesService(prisma);

    const result = await service.searchProperties({
      query:
        "Cho tôi biết số các tòa nhà của phường hòa khánh bắc thuộc liên chiểu là bao nhiêu",
      limit: 5
    });

    expect(result.answer).toEqual(
      expect.objectContaining({
        type: "count",
        count: 14300,
        filters: {
          ward: "hoa khanh bac",
          district: "lien chieu"
        }
      })
    );
    expect(result.meta.tokens).toEqual(["hoa", "khanh", "bac", "lien", "chieu"]);
    expect(result.meta.searchMode).toBe("postgres-normalized-vietnamese-nl");
    expect(prisma.buildingProperty.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          AND: expect.arrayContaining([
            { searchTextNormalized: { contains: "hoa khanh bac" } },
            { searchTextNormalized: { contains: "lien chieu" } },
            { searchTextNormalized: { contains: "hoa" } },
            { searchTextNormalized: { contains: "khanh" } },
            { searchTextNormalized: { contains: "bac" } },
            { searchTextNormalized: { contains: "lien" } },
            { searchTextNormalized: { contains: "chieu" } }
          ])
        })
      })
    );
  });

  it("answers Vietnamese building-density questions with text and map regions", async () => {
    const prisma = prismaStub({
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          cellId: "16.070:108.150",
          count: 81,
          centerLat: 16.071,
          centerLng: 108.151,
          minLat: 16.07,
          minLng: 108.15,
          maxLat: 16.072,
          maxLng: 108.152,
          ward: "Hoa Khanh Bac",
          district: "Lien Chieu"
        }
      ]),
      buildingProperty: {
        findMany: jest.fn().mockResolvedValue([propertyRow]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(10308),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn()
      }
    });
    const service = new PropertiesService(prisma);

    const result = await service.searchProperties({
      query: "vùng nào ở hòa khánh bắc có số lượng nhà dày đặc nhất",
      limit: 5
    });

    expect(result.answer).toEqual(
      expect.objectContaining({
        type: "density",
        count: 10308,
        topRegion: expect.objectContaining({
          count: 81,
          center: { lat: 16.071, lng: 108.151 }
        })
      })
    );
    expect(result.map).toEqual(
      expect.objectContaining({
        type: "property-density",
        regions: [
          expect.objectContaining({
            count: 81,
            bbox: {
              south: 16.07,
              west: 108.15,
              north: 16.072,
              east: 108.152
            }
          })
        ]
      })
    );
    expect(result.meta.searchMode).toBe("postgres-normalized-vietnamese-nl-fuzzy-density");
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("FLOOR"),
      0.002,
      0.002,
      "%hoa khanh bac%",
      "%hoa%",
      "%khanh%",
      "%bac%",
      6
    );
  });

  it("creates a managed Da Nang property with normalized search text and audit history", async () => {
    const prisma = prismaStub({
      buildingProperty: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(7),
        create: jest.fn().mockResolvedValue(propertyRow),
        update: jest.fn(),
        upsert: jest.fn()
      }
    });
    const service = new PropertiesService(prisma);

    await expect(
      service.createProperty(
        {
          name: "Nha Nguyen Luong Bang",
          addressLine: "546 Nguyen Luong Bang",
          street: "Nguyen Luong Bang",
          ward: "Hoa Khanh Bac",
          district: "Lien Chieu",
          centroidLat: 16.071,
          centroidLng: 108.15
        },
        "admin-1"
      )
    ).resolves.toEqual(propertyRow);

    expect(prisma.buildingProperty.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "DN-BLD-000008",
        city: "Da Nang",
        propertyType: "building",
        source: "manual",
        status: "ACTIVE",
        searchTextNormalized: expect.stringContaining("nguyen luong bang")
      })
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        action: "properties.create",
        entityType: "BuildingProperty",
        entityId: "property-1"
      })
    });
  });

  it("rejects invalid property coordinates", async () => {
    const service = new PropertiesService(prismaStub());

    await expect(
      service.createProperty({
        name: "Bad coordinates",
        centroidLat: 120,
        centroidLng: 108.15
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updates an existing property and recomputes searchable text", async () => {
    const prisma = prismaStub({
      buildingProperty: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(propertyRow),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({
          ...propertyRow,
          ward: "Hoa Khanh Nam"
        }),
        upsert: jest.fn()
      }
    });
    const service = new PropertiesService(prisma);

    await expect(
      service.updateProperty("property-1", { ward: "Hoa Khanh Nam" }, "admin-1")
    ).resolves.toMatchObject({ ward: "Hoa Khanh Nam" });

    expect(prisma.buildingProperty.update).toHaveBeenCalledWith({
      where: { id: "property-1" },
      data: expect.objectContaining({
        ward: "Hoa Khanh Nam",
        searchTextNormalized: expect.stringContaining("hoa khanh nam")
      })
    });
  });

  it("throws not found when updating a missing property", async () => {
    const prisma = prismaStub({
      buildingProperty: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn()
      }
    });
    const service = new PropertiesService(prisma);

    await expect(service.updateProperty("missing", { name: "Missing" })).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("soft deletes a property and records audit history", async () => {
    const prisma = prismaStub({
      buildingProperty: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(propertyRow),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({
          ...propertyRow,
          deletedAt: new Date("2026-05-03T00:00:00.000Z")
        }),
        upsert: jest.fn()
      }
    });
    const service = new PropertiesService(prisma);

    await service.deleteProperty("property-1", "admin-1");

    expect(prisma.buildingProperty.update).toHaveBeenCalledWith({
      where: { id: "property-1" },
      data: { deletedAt: expect.any(Date), status: "ARCHIVED" }
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        action: "properties.delete",
        entityId: "property-1"
      })
    });
  });

  it("imports Overture building features with upsert semantics", async () => {
    const prisma = prismaStub({
      buildingProperty: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(41),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn().mockResolvedValue(propertyRow)
      }
    });
    const service = new PropertiesService(prisma);

    const result = await service.importOvertureBuildings(
      [
        {
          id: "overture-building-1",
          names: { primary: "Nha mau Nguyen Luong Bang" },
          num_floors: 3,
          height: 12.5,
          bbox: { xmin: 108.149, ymin: 16.07, xmax: 108.151, ymax: 16.072 },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [108.149, 16.07],
                [108.151, 16.07],
                [108.151, 16.072],
                [108.149, 16.072],
                [108.149, 16.07]
              ]
            ]
          }
        }
      ],
      {
        actorUserId: "admin-1",
        sourceVersion: "2026-04-20",
        defaultWard: "Hoa Khanh Bac",
        defaultDistrict: "Lien Chieu"
      }
    );

    expect(result).toEqual({ imported: 1, skipped: 0 });
    expect(prisma.buildingProperty.upsert).toHaveBeenCalledWith({
      where: { overtureId: "overture-building-1" },
      update: expect.objectContaining({
        sourceVersion: "2026-04-20",
        searchTextNormalized: expect.stringContaining("hoa khanh bac")
      }),
      create: expect.objectContaining({
        code: "DN-BLD-000042",
        overtureId: "overture-building-1",
        source: "overture",
        sourceVersion: "2026-04-20",
        centroidLat: 16.071,
        centroidLng: 108.15
      })
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        action: "properties.import.overture",
        metadata: { imported: 1, skipped: 0, sourceVersion: "2026-04-20" }
      })
    });
  });
});
