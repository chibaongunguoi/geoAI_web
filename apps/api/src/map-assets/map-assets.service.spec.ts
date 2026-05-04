import { BadRequestException } from "@nestjs/common";
import { MapAssetsService } from "./map-assets.service";

function prismaStub(overrides = {}) {
  return {
    assetDisplayUserConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn()
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    ...overrides
  };
}

const assetConfig = {
  labelMode: "code",
  colorMode: "priority",
  popupFields: ["code", "name", "ownerUnit"]
};

describe("MapAssetsService", () => {
  it("returns default asset display config when none is saved", async () => {
    const prisma = prismaStub({
      assetDisplayUserConfig: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn()
      }
    });
    const service = new MapAssetsService(prisma);

    await expect(service.getConfig("user-1")).resolves.toEqual({
      state: {
        labelMode: "off",
        colorMode: "type",
        popupFields: ["code", "name", "status", "type", "updatedAt"]
      }
    });
  });

  it("upserts valid asset display config and writes audit history", async () => {
    const prisma = prismaStub({
      assetDisplayUserConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn().mockResolvedValue({ userId: "user-1", state: assetConfig })
      }
    });
    const service = new MapAssetsService(prisma);

    await expect(service.saveConfig("user-1", assetConfig)).resolves.toEqual({
      state: assetConfig
    });

    expect(prisma.assetDisplayUserConfig.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: { state: assetConfig },
      create: { userId: "user-1", state: assetConfig }
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: "user-1",
        action: "map.assets.config.update",
        entityType: "AssetDisplayUserConfig",
        entityId: "user-1",
        metadata: { state: assetConfig }
      }
    });
  });

  it("rejects invalid asset display config", async () => {
    const service = new MapAssetsService(prismaStub());

    await expect(
      service.saveConfig("user-1", {
        labelMode: "bad",
        colorMode: "type",
        popupFields: ["code"]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns asset display history with bounded take", async () => {
    const items = [{ id: "log-1", action: "map.assets.config.update" }];
    const prisma = prismaStub({
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue(items)
      }
    });
    const service = new MapAssetsService(prisma);

    await expect(service.getHistory("user-1", 80)).resolves.toEqual({ items });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          actorUserId: "user-1",
          action: { startsWith: "map.assets." }
        },
        take: 50
      })
    );
  });

  it("exports current asset config and history", async () => {
    const history = [{ id: "log-1", action: "map.assets.config.update" }];
    const prisma = prismaStub({
      assetDisplayUserConfig: {
        findUnique: jest.fn().mockResolvedValue({ userId: "user-1", state: assetConfig }),
        upsert: jest.fn()
      },
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue(history)
      }
    });
    const service = new MapAssetsService(prisma);

    const result = await service.exportConfig("user-1");

    expect(result.userId).toBe("user-1");
    expect(result.config).toEqual(assetConfig);
    expect(result.history).toEqual(history);
    expect(result.exportedAt).toEqual(expect.any(String));
  });
});
