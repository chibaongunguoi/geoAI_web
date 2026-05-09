import { DashboardService } from "./dashboard.service";

function prismaStub(rows: any[] = []) {
  return {
    buildingProperty: {
      findMany: jest.fn().mockResolvedValue(rows)
    }
  };
}

const baseRow = {
  id: "p1",
  code: "DN-001",
  name: "Building 1",
  status: "ACTIVE",
  propertyType: "building",
  district: "Lien Chieu",
  ward: "Hoa Khanh Bac",
  centroidLat: 16.071,
  centroidLng: 108.15,
  updatedAt: new Date("2026-05-08T00:00:00.000Z"),
  geometry: { type: "Point", coordinates: [108.15, 16.071] }
};

describe("DashboardService", () => {
  it("returns filtered dashboard totals, buckets, map extent, trend, and top assets", async () => {
    const rows = [
      baseRow,
      {
        ...baseRow,
        id: "p2",
        code: "DN-002",
        status: "REVIEW",
        district: "Hai Chau",
        ward: "Thach Thang",
        centroidLat: 16.05,
        centroidLng: 108.22,
        updatedAt: new Date("2026-05-02T00:00:00.000Z"),
        geometry: null
      }
    ];
    const prisma = prismaStub(rows);
    const service = new DashboardService(prisma as any);

    const result = await service.getAssetSummary({ district: "Lien Chieu", updatedFrom: "2026-05-01" });

    expect(prisma.buildingProperty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          district: { contains: "Lien Chieu" },
          updatedAt: expect.objectContaining({ gte: expect.any(Date) })
        })
      })
    );
    expect(result.totals).toEqual(
      expect.objectContaining({
        total: 2,
        active: 1,
        review: 1,
        missingGeometry: 1
      })
    );
    expect(result.buckets.byStatus).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "ACTIVE", count: 1 })])
    );
    expect(result.map).toEqual(
      expect.objectContaining({
        count: 2,
        center: expect.objectContaining({ lat: expect.any(Number), lng: expect.any(Number) }),
        bbox: expect.objectContaining({ west: 108.15, east: 108.22 })
      })
    );
    expect(result.trend).toEqual(
      expect.arrayContaining([expect.objectContaining({ date: "2026-05-08", count: 1 })])
    );
    expect(result.topAssets[0]).toEqual(expect.objectContaining({ code: "DN-001" }));
  });

  it("ignores invalid dates and returns empty summary safely", async () => {
    const prisma = prismaStub([]);
    const service = new DashboardService(prisma as any);

    const result = await service.getAssetSummary({ updatedFrom: "bad-date", updatedTo: "also-bad" });

    expect(prisma.buildingProperty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" }
      })
    );
    expect(result.totals.total).toBe(0);
    expect(result.map).toEqual({ bbox: null, center: null, count: 0 });
    expect(result.topAssets).toEqual([]);
  });
});
