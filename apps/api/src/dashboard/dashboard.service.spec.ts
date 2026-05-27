import { DashboardService } from "./dashboard.service";

function prismaStub(groups: any[] = []) {
  return {
    buildingProperty: {
      groupBy: jest.fn().mockResolvedValue(groups)
    }
  };
}

describe("DashboardService", () => {
  it("returns building count grouped by district", async () => {
    const groups = [
      { district: "Lien Chieu", _count: { id: 10 } },
      { district: "Hai Chau", _count: { id: 15 } }
    ];
    const prisma = prismaStub(groups);
    const service = new DashboardService(prisma as any);

    const result = await service.getAssetSummary();

    expect(prisma.buildingProperty.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["district"],
        _count: { id: true },
        where: { deletedAt: null }
      })
    );
    expect(result.buckets.byDistrict).toEqual([
      { key: "Hai Chau", label: "Hai Chau", count: 15 },
      { key: "Lien Chieu", label: "Lien Chieu", count: 10 }
    ]);
  });

  it("handles empty groups", async () => {
    const prisma = prismaStub([]);
    const service = new DashboardService(prisma as any);

    const result = await service.getAssetSummary();

    expect(result.buckets.byDistrict).toEqual([]);
  });
});
