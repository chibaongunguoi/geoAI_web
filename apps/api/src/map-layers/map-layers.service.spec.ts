import { MapLayersService } from "./map-layers.service";

function prismaStub(overrides = {}) {
  return {
    layerUserConfig: {
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

const layerState = {
  visible: { "sample-assets": true },
  opacity: { "sample-assets": 0.75 },
  order: ["sample-assets"]
};

describe("MapLayersService", () => {
  it("returns null when a user has no saved layer config", async () => {
    const prisma = prismaStub({
      layerUserConfig: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn()
      }
    });
    const service = new MapLayersService(prisma);

    await expect(service.getConfig("user-1")).resolves.toEqual({ state: null });
  });

  it("upserts a user layer config and writes audit history", async () => {
    const prisma = prismaStub({
      layerUserConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn().mockResolvedValue({ userId: "user-1", state: layerState })
      }
    });
    const service = new MapLayersService(prisma);

    await expect(service.saveConfig("user-1", layerState)).resolves.toEqual({
      state: layerState
    });

    expect(prisma.layerUserConfig.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: { state: layerState },
      create: { userId: "user-1", state: layerState }
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: "user-1",
        action: "map.layers.config.update",
        entityType: "LayerUserConfig",
        entityId: "user-1",
        metadata: { state: layerState }
      }
    });
  });

  it("returns current user layer history with a bounded take value", async () => {
    const items = [
      {
        id: "log-1",
        action: "map.layers.config.update",
        entityId: "user-1",
        metadata: { changed: true },
        createdAt: new Date("2026-04-30T00:00:00.000Z")
      }
    ];
    const prisma = prismaStub({
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue(items)
      }
    });
    const service = new MapLayersService(prisma);

    await expect(service.getHistory("user-1", 200)).resolves.toEqual({ items });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        actorUserId: "user-1",
        action: { startsWith: "map.layers." }
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        entityId: true,
        metadata: true,
        createdAt: true
      }
    });
  });

  it("exports saved config and recent history for the current user", async () => {
    const history = [{ id: "log-1", action: "map.layers.config.update" }];
    const prisma = prismaStub({
      layerUserConfig: {
        findUnique: jest.fn().mockResolvedValue({ userId: "user-1", state: layerState }),
        upsert: jest.fn()
      },
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue(history)
      }
    });
    const service = new MapLayersService(prisma);

    const result = await service.exportConfig("user-1");

    expect(result.userId).toBe("user-1");
    expect(result.config).toEqual(layerState);
    expect(result.history).toEqual(history);
    expect(result.exportedAt).toEqual(expect.any(String));
  });

  it("normalizes saved config to one visible layer", async () => {
    const prisma = prismaStub({
      layerUserConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn().mockImplementation((args) =>
          Promise.resolve({ userId: "user-1", state: args.update.state })
        )
      }
    });
    const service = new MapLayersService(prisma);

    await service.saveConfig("user-1", {
      visible: { "sample-assets": true, "admin-boundaries": true },
      opacity: { "sample-assets": 0.75, "admin-boundaries": 0.9 },
      order: ["admin-boundaries", "sample-assets"]
    });

    expect(prisma.layerUserConfig.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: {
        state: {
          visible: { "admin-boundaries": true, "sample-assets": false },
          opacity: { "sample-assets": 0.75, "admin-boundaries": 0.9 },
          order: ["admin-boundaries", "sample-assets"]
        }
      },
      create: {
        userId: "user-1",
        state: {
          visible: { "admin-boundaries": true, "sample-assets": false },
          opacity: { "sample-assets": 0.75, "admin-boundaries": 0.9 },
          order: ["admin-boundaries", "sample-assets"]
        }
      }
    });
  });
});
