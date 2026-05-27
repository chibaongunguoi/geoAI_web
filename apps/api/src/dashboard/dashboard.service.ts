import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type DashboardSummaryInput = {
  status?: string;
  propertyType?: string;
  district?: string;
  ward?: string;
  updatedFrom?: string;
  updatedTo?: string;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssetSummary(input: DashboardSummaryInput = {}) {
    const where: Record<string, unknown> = { deletedAt: null };

    // Group by district to get building count
    const groups = await this.prisma.buildingProperty.groupBy({
      by: ["district"],
      _count: {
        id: true,
      },
      where,
    });

    const byDistrict = groups
      .map((g) => ({
        key: g.district || "Unknown",
        label: g.district || "Không xác định",
        count: g._count.id,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return {
      buckets: {
        byDistrict,
      },
    };
  }
}
