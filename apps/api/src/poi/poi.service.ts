import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
import { BetterSqliteService } from "../prisma/better-sqlite.service";
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
  code?: string;
  name: string;
  category: string;
  vietnameseCategory: string;
  latitude: number;
  longitude: number;
  centroidLat?: number;
  centroidLng?: number;
  address: string | null;
  street: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  status?: string;
  propertyType?: string;
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

type PoiSemanticIntentType = "poi-density" | "poi-count" | "poi-list";
type PoiDensityDirection = "highest" | "lowest";

interface PoiLocationFilter {
  ward?: string;
  district?: string;
}

interface PoiSemanticIntent {
  type: PoiSemanticIntentType;
  direction: PoiDensityDirection;
  categories: string[];
  categoryLabel: string;
  filters: PoiLocationFilter;
}

interface PoiDensityRegion {
  id: string;
  label: string;
  ward: string;
  district: string;
  count: number;
  center: { lat: number; lng: number };
  bbox: { west: number; south: number; east: number; north: number };
}

export interface PoiSemanticResult {
  items: PoiSearchItem[];
  total: number;
  answer: {
    type: PoiSemanticIntentType;
    text: string;
    count: number;
    filters: PoiLocationFilter & { category?: string };
  };
  map?: {
    type: "property-density";
    regions: PoiDensityRegion[];
  };
  meta: {
    searchMode: "sqlite-poi-semantic";
    categories: string[];
    intent: PoiSemanticIntentType;
    densityDirection?: PoiDensityDirection;
    warnings?: string[];
  };
}

interface PoiSqlRow {
  id: string;
  name: string;
  category: string;
  address: string | null;
  street: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  confidence?: number;
}

interface PoiDensityRow {
  ward: string | null;
  district: string | null;
  count: number;
  centerLat: number;
  centerLng: number;
}

@Injectable()
export class PoiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryMapper: CategoryMapper,
    @Optional() private readonly sqlite?: BetterSqliteService
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
    const trimmedQuery = query.q?.trim() || "";
    const categories = trimmedQuery
      ? this.categoryMapper.findCategories(trimmedQuery)
      : this.categoryMapper.knownCategories();
    const limit = Math.min(query.limit || 200, 200);

    const where: Record<string, unknown> = {};

    if (categories.length > 0) {
      where.category = { in: categories };
    } else if (trimmedQuery) {
      // Fallback: direct substring match on category field
      where.category = { contains: trimmedQuery };
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

  async semanticSearch(query: string, limit = 20): Promise<PoiSemanticResult> {
    const trimmedQuery = query?.trim() || "";
    if (!trimmedQuery) {
      throw new BadRequestException("POI semantic query is required");
    }

    if (!this.sqlite) {
      throw new BadRequestException("SQLite POI semantic search is unavailable");
    }

    const intent = this.semanticIntent(trimmedQuery);

    if (intent.type === "poi-density") {
      return this.semanticDensity(intent);
    }

    if (intent.type === "poi-count") {
      return this.semanticCount(intent);
    }

    return this.semanticList(intent, Math.min(Math.max(Number(limit) || 20, 1), 50));
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
        source: "overture",
        propertyType: place.category || "poi",
        searchText: `${code} ${place.name || ""} ${place.category || ""} ${place.street || ""} ${place.ward || ""} ${place.district || ""}`.trim(),
        searchTextNormalized: `${code} ${place.name || ""} ${place.category || ""} ${place.street || ""} ${place.ward || ""} ${place.district || ""}`
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

  private semanticIntent(query: string): PoiSemanticIntent {
    const normalized = this.normalizeText(query);
    const categories = this.categoryMapper.findCategories(query);
    const filters = this.locationFilters(normalized);
    const direction: PoiDensityDirection =
      /\b(thua thot|it nhat|vang|it|thap nhat)\b/.test(normalized)
        ? "lowest"
        : "highest";
    const asksForDensity =
      /\b(nhieu\b.*\bnhat|it\b.*\bnhat|cao\b.*\bnhat|thap\b.*\bnhat|day dac|thua thot)\b/.test(normalized);
    const asksForList = /\b(liet ke|danh sach|tim|cho toi)\b/.test(normalized);
    const hasLocationFilter = Boolean(filters.ward || filters.district);

    const type: PoiSemanticIntentType =
      /\b(bao nhieu|so luong|co may|tong cong)\b/.test(normalized)
        ? "poi-count"
        : (asksForList || hasLocationFilter) && !asksForDensity
          ? "poi-list"
          : "poi-density";

    return {
      type,
      direction,
      categories: categories.length > 0 ? categories : this.categoryMapper.knownCategories(),
      categoryLabel: this.categoryLabel(categories),
      filters
    };
  }

  private locationFilters(normalizedQuery: string): PoiLocationFilter {
    const locations = this.sqlite?.all<{ ward: string | null; district: string | null }>(
      `SELECT DISTINCT ward, district FROM "Place" WHERE district IS NOT NULL OR ward IS NOT NULL`
    ) || [];
    const sorted = [...locations].sort(
      (left, right) =>
        Math.max(right.ward?.length || 0, right.district?.length || 0) -
        Math.max(left.ward?.length || 0, left.district?.length || 0)
    );

    for (const row of sorted) {
      if (row.ward && normalizedQuery.includes(this.normalizeText(row.ward))) {
        return { ward: row.ward, district: row.district || undefined };
      }
    }

    for (const row of sorted) {
      if (row.district && normalizedQuery.includes(this.normalizeText(row.district))) {
        return { district: row.district };
      }
    }

    return { district: "H\u1ea3i Ch\u00e2u" };
  }

  private semanticDensity(intent: PoiSemanticIntent): PoiSemanticResult {
    const where = this.poiWhereClause(intent);
    const order = intent.direction === "lowest" ? "ASC" : "DESC";
    const rows = this.sqlite!.all<PoiDensityRow>(
      `
      SELECT
        ward,
        district,
        COUNT(*) AS count,
        AVG(latitude) AS centerLat,
        AVG(longitude) AS centerLng
      FROM "Place"
      WHERE ${where.sql}
        AND ward IS NOT NULL
      GROUP BY ward, district
      ORDER BY count ${order}, ward ASC
      LIMIT 10
      `,
      ...where.params
    );
    const regions = rows.map((row, index) => this.densityRegion(row, index));
    const top = regions[0];
    const text = top
      ? `${top.label} c\u00f3 ${intent.direction === "lowest" ? "\u00edt" : "nhi\u1ec1u"} ${intent.categoryLabel} ${intent.direction === "lowest" ? "nh\u1ea5t" : "nh\u1ea5t"} trong ${intent.filters.district || "khu v\u1ef1c \u0111\u00e3 ch\u1ecdn"} v\u1edbi ${top.count.toLocaleString("vi-VN")} \u0111\u1ecba \u0111i\u1ec3m.`
      : `Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u ${intent.categoryLabel} ph\u00f9 h\u1ee3p.`;

    return {
      items: [],
      total: top?.count || 0,
      answer: {
        type: "poi-density",
        text,
        count: top?.count || 0,
        filters: { ...intent.filters, category: intent.categoryLabel }
      },
      map: { type: "property-density", regions },
      meta: {
        searchMode: "sqlite-poi-semantic",
        categories: intent.categories,
        intent: intent.type,
        densityDirection: intent.direction
      }
    };
  }

  private semanticCount(intent: PoiSemanticIntent): PoiSemanticResult {
    const where = this.poiWhereClause(intent);
    const row = this.sqlite!.all<{ count: number }>(
      `SELECT COUNT(*) AS count FROM "Place" WHERE ${where.sql}`,
      ...where.params
    )[0];
    const count = Number(row?.count || 0);
    const location = intent.filters.ward || intent.filters.district || "H\u1ea3i Ch\u00e2u";
    return {
      items: [],
      total: count,
      answer: {
        type: "poi-count",
        text: `C\u00f3 ${count.toLocaleString("vi-VN")} ${intent.categoryLabel} \u1edf ${location}.`,
        count,
        filters: { ...intent.filters, category: intent.categoryLabel }
      },
      meta: {
        searchMode: "sqlite-poi-semantic",
        categories: intent.categories,
        intent: intent.type
      }
    };
  }

  private semanticList(intent: PoiSemanticIntent, limit: number): PoiSemanticResult {
    const where = this.poiWhereClause(intent);
    const rows = this.sqlite!.all<PoiSqlRow>(
      `
      SELECT id, name, category, address, street, ward, district, city, latitude, longitude, confidence
      FROM "Place"
      WHERE ${where.sql}
      ORDER BY confidence DESC, name ASC
      LIMIT ?
      `,
      ...where.params,
      limit
    );
    const items = rows.map((row) => this.poiItem(row));
    const location = intent.filters.ward || intent.filters.district || "H\u1ea3i Ch\u00e2u";
    return {
      items,
      total: items.length,
      answer: {
        type: "poi-list",
        text: `T\u00ecm th\u1ea5y ${items.length.toLocaleString("vi-VN")} ${intent.categoryLabel} \u1edf ${location}.`,
        count: items.length,
        filters: { ...intent.filters, category: intent.categoryLabel }
      },
      meta: {
        searchMode: "sqlite-poi-semantic",
        categories: intent.categories,
        intent: intent.type
      }
    };
  }

  private poiWhereClause(intent: PoiSemanticIntent) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const categoryPlaceholders = intent.categories.map(() => "?").join(", ");
    const subcategoryConditions = intent.categories.map(() => `subcategories LIKE ?`);
    conditions.push(`(category IN (${categoryPlaceholders}) OR ${subcategoryConditions.join(" OR ")})`);
    params.push(...intent.categories, ...intent.categories.map((category) => `%"${category}"%`));

    if (intent.filters.ward) {
      conditions.push("ward = ?");
      params.push(intent.filters.ward);
    }

    if (intent.filters.district) {
      conditions.push("district = ?");
      params.push(intent.filters.district);
    }

    return { sql: conditions.join(" AND "), params };
  }

  private densityRegion(row: PoiDensityRow, index: number): PoiDensityRegion {
    const lat = Number(row.centerLat || 0);
    const lng = Number(row.centerLng || 0);
    const delta = 0.003;
    return {
      id: `poi-density-${index + 1}`,
      label: row.ward || `Khu v\u1ef1c ${index + 1}`,
      ward: row.ward || "",
      district: row.district || "",
      count: Number(row.count || 0),
      center: { lat, lng },
      bbox: {
        west: lng - delta,
        south: lat - delta,
        east: lng + delta,
        north: lat + delta
      }
    };
  }

  private poiItem(row: PoiSqlRow): PoiSearchItem {
    return {
      id: row.id,
      code: `POI-${row.id.slice(-8)}`,
      name: row.name,
      category: row.category,
      vietnameseCategory: this.categoryMapper.getVietnameseLabel(row.category),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      centroidLat: Number(row.latitude),
      centroidLng: Number(row.longitude),
      address: row.address,
      street: row.street,
      ward: row.ward,
      district: row.district,
      city: row.city,
      status: "POI",
      propertyType: this.categoryMapper.getVietnameseLabel(row.category)
    };
  }

  private categoryLabel(categories: string[]) {
    if (categories.includes("cafe") || categories.includes("coffee_shop")) {
      return "qu\u00e1n c\u00e0 ph\u00ea";
    }
    if (categories.includes("restaurant")) {
      return "nh\u00e0 h\u00e0ng";
    }
    if (categories.includes("hotel")) {
      return "kh\u00e1ch s\u1ea1n";
    }
    if (categories.includes("hospital")) {
      return "b\u1ec7nh vi\u1ec7n";
    }
    if (categories.includes("school")) {
      return "tr\u01b0\u1eddng h\u1ecdc";
    }
    return categories.length === 1
      ? this.categoryMapper.getVietnameseLabel(categories[0]).toLowerCase()
      : "\u0111i\u1ec3m quan t\u00e2m";
  }

  private normalizeText(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u0111/g, "d")
      .replace(/\u0110/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }
}
