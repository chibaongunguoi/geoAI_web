import { BadRequestException } from "@nestjs/common";
import { PropertiesService } from "./properties.service";

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

describe("PropertiesService asset import", () => {
  it("rejects malformed generic import payloads", async () => {
    const service = new PropertiesService(prismaStub());

    await expect(service.importAssetRows(null, { actorUserId: "admin-1" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("creates valid rows and writes audit metadata", async () => {
    const prisma = prismaStub();
    const service = new PropertiesService(prisma);

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
    const service = new PropertiesService(prisma);

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
