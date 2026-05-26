import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { BetterSqliteService } from "../prisma/better-sqlite.service";
import { CategoryMapper } from "./category-mapper";
import {
  PoiSemanticResult,
  PoiSemanticIntent,
  PoiSemanticIntentType,
  PoiDensityDirection,
  PoiLocationFilter,
  PoiDensityRegion,
  PoiSearchItem,
  PoiSqlRow,
  PoiDensityRow
} from "./poi.types";

@Injectable()
export class PoiSemanticService {
  constructor(
    private readonly categoryMapper: CategoryMapper,
    @Optional() private readonly sqlite?: BetterSqliteService
  ) {}

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
      `SELECT DISTINCT "ward", "district" FROM "BuildingProperty" WHERE "deletedAt" IS NULL AND ("district" IS NOT NULL OR "ward" IS NOT NULL)`
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
        "ward",
        "district",
        COUNT(*) AS count,
        AVG("centroidLat") AS centerLat,
        AVG("centroidLng") AS centerLng
      FROM "BuildingProperty"
      WHERE "deletedAt" IS NULL AND (${where.sql})
        AND "ward" IS NOT NULL
      GROUP BY "ward", "district"
      ORDER BY count ${order}, "ward" ASC
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
      `SELECT COUNT(*) AS count FROM "BuildingProperty" WHERE "deletedAt" IS NULL AND (${where.sql})`,
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
      SELECT "id", "code", "name", "propertyType", "addressLine", "street", "ward", "district", "city", "centroidLat", "centroidLng"
      FROM "BuildingProperty"
      WHERE "deletedAt" IS NULL AND (${where.sql})
      ORDER BY "name" ASC
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
    conditions.push(`"propertyType" IN (${categoryPlaceholders})`);
    params.push(...intent.categories);

    if (intent.filters.ward) {
      conditions.push('"ward" = ?');
      params.push(intent.filters.ward);
    }

    if (intent.filters.district) {
      conditions.push('"district" = ?');
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
      code: row.code,
      name: row.name || row.code,
      category: row.propertyType,
      vietnameseCategory: this.categoryMapper.getVietnameseLabel(row.propertyType),
      latitude: Number(row.centroidLat || 0),
      longitude: Number(row.centroidLng || 0),
      centroidLat: Number(row.centroidLat || 0),
      centroidLng: Number(row.centroidLng || 0),
      address: row.addressLine,
      street: row.street,
      ward: row.ward,
      district: row.district,
      city: row.city,
      status: "POI",
      propertyType: row.propertyType
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
