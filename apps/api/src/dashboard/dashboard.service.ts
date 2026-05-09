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

const VALID_STATUSES = new Set(["ACTIVE", "INACTIVE", "REVIEW", "ARCHIVED"]);
const RECENT_DAYS = 7;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validDate(value: unknown) {
  const text = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 10);
}

function bucketLabel(value: unknown, fallback = "Unknown") {
  const text = cleanText(value);
  return text || fallback;
}

function increment(map: Map<string, { key: string; label: string; count: number }>, value: unknown) {
  const key = bucketLabel(value);
  const current = map.get(key) || { key, label: key, count: 0 };
  current.count += 1;
  map.set(key, current);
}

function sortedBuckets(map: Map<string, { key: string; label: string; count: number }>) {
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssetSummary(input: DashboardSummaryInput = {}) {
    const filters = this.normalizeFilters(input);
    const where = this.searchWhere(filters);
    const rows = await this.prisma.buildingProperty.findMany({
      where,
      orderBy: { updatedAt: "desc" }
    });

    const byStatus = new Map<string, { key: string; label: string; count: number }>();
    const byType = new Map<string, { key: string; label: string; count: number }>();
    const byDistrict = new Map<string, { key: string; label: string; count: number }>();
    const byWard = new Map<string, { key: string; label: string; count: number }>();
    const trend = new Map<string, { date: string; count: number }>();
    const now = new Date();
    const recentCutoff = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);
    const totals = {
      total: rows.length,
      active: 0,
      inactive: 0,
      review: 0,
      archived: 0,
      recentlyUpdated: 0,
      missingGeometry: 0
    };
    const extent = {
      west: Number.POSITIVE_INFINITY,
      south: Number.POSITIVE_INFINITY,
      east: Number.NEGATIVE_INFINITY,
      north: Number.NEGATIVE_INFINITY,
      latTotal: 0,
      lngTotal: 0,
      count: 0
    };

    rows.forEach((row: any) => {
      const status = String(row.status || "").toUpperCase();
      if (status === "ACTIVE") totals.active += 1;
      if (status === "INACTIVE") totals.inactive += 1;
      if (status === "REVIEW") totals.review += 1;
      if (status === "ARCHIVED") totals.archived += 1;
      if (!row.geometry) totals.missingGeometry += 1;
      if (row.updatedAt instanceof Date && row.updatedAt >= recentCutoff) {
        totals.recentlyUpdated += 1;
      }

      increment(byStatus, row.status);
      increment(byType, row.propertyType);
      increment(byDistrict, row.district);
      increment(byWard, row.ward);

      const key = dateKey(row.updatedAt);
      const current = trend.get(key) || { date: key, count: 0 };
      current.count += 1;
      trend.set(key, current);

      const lat = Number(row.centroidLat);
      const lng = Number(row.centroidLng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        extent.west = Math.min(extent.west, lng);
        extent.south = Math.min(extent.south, lat);
        extent.east = Math.max(extent.east, lng);
        extent.north = Math.max(extent.north, lat);
        extent.latTotal += lat;
        extent.lngTotal += lng;
        extent.count += 1;
      }
    });

    return {
      filters,
      totals,
      buckets: {
        byStatus: sortedBuckets(byStatus),
        byType: sortedBuckets(byType),
        byDistrict: sortedBuckets(byDistrict),
        byWard: sortedBuckets(byWard)
      },
      trend: [...trend.values()].sort((a, b) => a.date.localeCompare(b.date)),
      map:
        extent.count > 0
          ? {
              bbox: {
                west: extent.west,
                south: extent.south,
                east: extent.east,
                north: extent.north
              },
              center: {
                lat: extent.latTotal / extent.count,
                lng: extent.lngTotal / extent.count
              },
              count: rows.length
            }
          : { bbox: null, center: null, count: 0 },
      topAssets: rows.slice(0, 10).map((row: any) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        status: row.status,
        propertyType: row.propertyType,
        district: row.district,
        ward: row.ward,
        centroidLat: row.centroidLat,
        centroidLng: row.centroidLng,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
      }))
    };
  }

  private normalizeFilters(input: DashboardSummaryInput) {
    const status = cleanText(input.status).toUpperCase();
    return {
      status: VALID_STATUSES.has(status) ? status : "",
      propertyType: cleanText(input.propertyType),
      district: cleanText(input.district),
      ward: cleanText(input.ward),
      updatedFrom: validDate(input.updatedFrom)?.toISOString().slice(0, 10) || "",
      updatedTo: validDate(input.updatedTo)?.toISOString().slice(0, 10) || ""
    };
  }

  private searchWhere(filters: ReturnType<DashboardService["normalizeFilters"]>) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.propertyType) where.propertyType = filters.propertyType;
    if (filters.district) where.district = { contains: filters.district };
    if (filters.ward) where.ward = { contains: filters.ward };

    const updatedAt: Record<string, Date> = {};
    const from = validDate(filters.updatedFrom);
    const to = validDate(filters.updatedTo);
    if (from) updatedAt.gte = from;
    if (to) {
      const end = new Date(to);
      end.setUTCHours(23, 59, 59, 999);
      updatedAt.lte = end;
    }
    if (Object.keys(updatedAt).length > 0) where.updatedAt = updatedAt;

    return where;
  }
}
