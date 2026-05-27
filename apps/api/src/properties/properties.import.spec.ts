import { BadRequestException } from "@nestjs/common";
import { PropertiesCrudService } from "./properties.crud.service";
import { PropertiesImportService } from "./properties.import.service";
import { PropertiesSpatialService } from "./properties.spatial.service";

function prismaStub(overrides = {}) {
  return {
    buildingProperty: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: "created-1" }),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    ...overrides,
  };
}

function buildService(prisma: ReturnType<typeof prismaStub>) {
  const crud = new PropertiesCrudService(prisma as never);
  const spatial = new PropertiesSpatialService(prisma as never);
  return new PropertiesImportService(prisma as never, crud, spatial);
}

describe("PropertiesService asset import", () => {
  it("rejects malformed generic import payloads", async () => {
    const service = buildService(prismaStub());

    await expect(service.importAssetRows(null, { actorUserId: "admin-1" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("creates valid rows and writes audit metadata", async () => {
    const prisma = prismaStub();
    const service = buildService(prisma);

    const result = await service.importAssetRows(
      [{ code: "DN-001", name: "Asset", centroidLat: 16.07, centroidLng: 108.22 }],
      { actorUserId: "admin-1" },
    );

    expect(result).toEqual({ imported: 1, skipped: 0, failedRows: [] });
    expect(prisma.buildingProperty.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "DN-001",
        name: "Asset",
        source: "manual-import",
        searchTextNormalized: expect.stringContaining("dn 001"),
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        action: "properties.import.assets",
        metadata: expect.objectContaining({ imported: 1, skipped: 0, failedRows: 0 }),
      }),
    });
  });

  it("rejects duplicate existing codes without overwriting", async () => {
    const prisma = prismaStub({
      buildingProperty: {
        findMany: jest.fn().mockResolvedValue([{ code: "DN-001" }]),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
    });
    const service = buildService(prisma);

    const result = await service.importAssetRows(
      [{ code: "DN-001", name: "Asset", centroidLat: 16.07, centroidLng: 108.22 }],
      { actorUserId: "admin-1" },
    );

    expect(result.imported).toBe(0);
    expect(result.failedRows[0]).toEqual(
      expect.objectContaining({ code: "DN-001", errors: ["Asset code already exists."] }),
    );
    expect(prisma.buildingProperty.create).not.toHaveBeenCalled();
  });
});
