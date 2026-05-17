import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CategoryMapper } from "./category-mapper";

export interface PoiImportFeature {
  overtureId: string;
  name: string;
  category: string;
  subcategories?: string[];
  address?: string | null;
  street?: string | null;
  ward?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geometry?: unknown;
  confidence?: number;
  source?: string;
}

export interface PoiImportSummary {
  created: number;
  updated: number;
  skipped: number;
}

export interface PoiSearchQuery {
  q: string;
  south?: number;
  west?: number;
  north?: number;
  east?: number;
  limit?: number;
}

export interface PoiSearchItem {
  id: string;
  name: string;
  category: string;
  vietnameseCategory: string;
  latitude: number;
  longitude: number;
  address: string | null;
  street: string | null;
}

export interface PoiSearchResult {
  items: PoiSearchItem[];
  total: number;
}

export interface ConvertResult {
  success: boolean;
  assetId: string;
  assetCode: string;
}

@Injectable()
export class PoiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryMapper: CategoryMapper
  ) {}

  async importPlaces(
    features: PoiImportFeature[],
    sourceVersion?: string
  ): Promise<PoiImportSummary> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const feature of features) {
      if (!this.isValidGeometry(feature)) {
        skipped++;
        continue;
      }

      if (!feature.overtureId || !feature.name || !feature.category) {
        skipped++;
        continue;
      }

      const data = {
        name: feature.name,
        category: feature.category,
        subcategories: feature.subcategories || [],
        address: feature.address || null,
        street: feature.street || null,
        ward: feature.ward || null,
        district: feature.district || null,
        latitude: feature.latitude!,
        longitude: feature.longitude!,
        geometry: feature.geometry as object,
        confidence: feature.confidence || 0,
        source: feature.source || "overture-places",
        sourceVersion: sourceVersion || null
      };

      const existing = await this.prisma.place.findUnique({
        where: { overtureId: feature.overtureId }
      });

      if (existing) {
        await this.prisma.place.update({
          where: { overtureId: feature.overtureId },
          data
        });
        updated++;
      } else {
        await this.prisma.place.create({
          data: { overtureId: feature.overtureId, ...data }
        });
        created++;
      }
    }

    return { created, updated, skipped };
  }

  async searchByCategory(query: PoiSearchQuery): Promise<PoiSearchResult> {
    if (!query.q || !query.q.trim()) {
      return { items: [], total: 0 };
    }

    const categories = this.categoryMapper.findCategories(query.q.trim());
    const limit = Math.min(query.limit || 200, 200);

    const where: Record<string, unknown> = {};

    if (categories.length > 0) {
      where.category = { in: categories };
    } else {
      // Fallback: direct substring match on category field
      where.category = { contains: query.q.trim() };
    }

    // Apply viewport bounds if provided
    if (
      query.south != null &&
      query.west != null &&
      query.north != null &&
      query.east != null
    ) {
      where.latitude = { gte: query.south, lte: query.north };
      where.longitude = { gte: query.west, lte: query.east };
    }

    const places = await this.prisma.place.findMany({
      where,
      take: limit,
      orderBy: { confidence: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        latitude: true,
        longitude: true,
        address: true,
        street: true
      }
    });

    const items: PoiSearchItem[] = places.map((place) => ({
      id: place.id,
      name: place.name,
      category: place.category,
      vietnameseCategory: this.categoryMapper.getVietnameseLabel(place.category),
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address,
      street: place.street
    }));

    return { items, total: items.length };
  }

  async convertToAsset(
    placeId: string,
    actorUserId: string
  ): Promise<ConvertResult> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId }
    });

    if (!place) {
      throw new NotFoundException("Place not found");
    }

    // Check for duplicate
    const existing = await this.prisma.buildingProperty.findUnique({
      where: { overtureId: place.overtureId }
    });

    if (existing) {
      throw new ConflictException("POI đã được thêm vào tài sản");
    }

    // Generate code
    const count = await this.prisma.buildingProperty.count();
    const code = `DN-POI-${String(count + 1).padStart(6, "0")}`;

    // Create BuildingProperty
    const asset = await this.prisma.buildingProperty.create({
      data: {
        code,
        overtureId: place.overtureId,
        name: place.name,
        street: place.street,
        ward: place.ward,
        district: place.district,
        city: place.city,
        centroidLat: place.latitude,
        centroidLng: place.longitude,
        geometry: place.geometry as object,
        source: "overture-places",
        propertyType: "poi",
        searchText: `${code} ${place.name || ""} ${place.street || ""} ${place.ward || ""} ${place.district || ""}`.trim(),
        searchTextNormalized: `${code} ${place.name || ""} ${place.street || ""} ${place.ward || ""} ${place.district || ""}`
          .toLowerCase()
          .trim()
      }
    });

    // Create AuditLog
    await this.prisma.auditLog.create({
      data: {
        action: "poi_to_asset",
        entityType: "BuildingProperty",
        entityId: asset.id,
        actorUserId,
        metadata: { placeId, placeName: place.name, category: place.category }
      }
    });

    return { success: true, assetId: asset.id, assetCode: code };
  }

  private isValidGeometry(feature: PoiImportFeature): boolean {
    if (feature.latitude == null || feature.longitude == null) return false;
    if (!Number.isFinite(feature.latitude) || !Number.isFinite(feature.longitude)) return false;
    if (feature.geometry == null) return false;
    return true;
  }
}
