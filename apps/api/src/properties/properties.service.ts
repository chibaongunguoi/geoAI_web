import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type Delegate = {
  findMany?: (args: unknown) => Promise<unknown[]>;
  findUnique?: (args: unknown) => Promise<unknown>;
  count?: (args?: unknown) => Promise<number>;
  create?: (args: unknown) => Promise<unknown>;
  update?: (args: unknown) => Promise<unknown>;
  upsert?: (args: unknown) => Promise<unknown>;
};

type PropertiesPrisma = {
  $queryRawUnsafe?: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
  buildingProperty: Required<
    Pick<Delegate, "findMany" | "findUnique" | "count" | "create" | "update" | "upsert">
  >;
  auditLog: Required<Pick<Delegate, "create">>;
};

type PropertyStatus = "ACTIVE" | "INACTIVE" | "REVIEW" | "ARCHIVED";

type BuildingPropertyRow = {
  id: string;
  code?: string;
  overtureId?: string | null;
  name?: string | null;
  addressLine?: string | null;
  street?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  propertyType?: string | null;
  status?: string | null;
  source?: string | null;
  sourceVersion?: string | null;
  level?: number | null;
  height?: number | null;
  floors?: number | null;
  areaSqm?: number | null;
  centroidLat?: number | null;
  centroidLng?: number | null;
  bbox?: unknown;
  geometry?: unknown;
  attributes?: unknown;
  searchText?: string | null;
  searchTextNormalized?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

type PropertyDensityRegion = {
  id: string;
  label: string;
  count: number;
  center: {
    lat: number;
    lng: number;
  };
  bbox: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  ward?: string;
  district?: string;
};

type PropertySearchMap = {
  type: "property-density";
  regions: PropertyDensityRegion[];
};

type PropertySearchAnswer = {
  type: "count" | "density";
  count: number;
  filters: {
    ward?: string;
    district?: string;
  };
  text: string;
  topRegion?: PropertyDensityRegion;
};

type SearchIntent = {
  type: "list" | "count" | "density";
  filters: {
    ward?: string;
    district?: string;
  };
};

type DensityRegionRow = {
  cellId?: string;
  count?: number;
  centerLat?: number;
  centerLng?: number;
  minLat?: number;
  minLng?: number;
  maxLat?: number;
  maxLng?: number;
  ward?: string | null;
  district?: string | null;
};

export type PropertySearchInput = {
  query?: string;
  street?: string;
  ward?: string;
  district?: string;
  status?: string;
  limit?: number;
};

export type PropertyMutationInput = {
  code?: string;
  overtureId?: string;
  name?: string;
  addressLine?: string;
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
  propertyType?: string;
  status?: PropertyStatus;
  source?: string;
  sourceVersion?: string;
  level?: number;
  height?: number;
  floors?: number;
  areaSqm?: number;
  centroidLat?: number;
  centroidLng?: number;
  bbox?: unknown;
  geometry?: unknown;
  attributes?: unknown;
  embedding?: unknown;
};

type ImportOptions = {
  actorUserId?: string;
  sourceVersion?: string;
  defaultWard?: string;
  defaultDistrict?: string;
};

type OvertureFeature = {
  id?: unknown;
  bbox?: unknown;
  geometry?: unknown;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
};

const DEFAULT_CITY = "Da Nang";
const DEFAULT_PROPERTY_TYPE = "building";
const DEFAULT_STATUS: PropertyStatus = "ACTIVE";
const DEFAULT_SOURCE = "manual";
const OVERTURE_SOURCE = "overture";
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_DENSITY_GRID_SIZE = 0.002;
const DEFAULT_DENSITY_REGION_LIMIT = 6;
const VALID_STATUSES = new Set<PropertyStatus>([
  "ACTIVE",
  "INACTIVE",
  "REVIEW",
  "ARCHIVED"
]);
const STOP_WORDS = new Set([
  "cho",
  "toi",
  "danh",
  "sach",
  "cac",
  "can",
  "nha",
  "o",
  "duong",
  "tai",
  "phuong",
  "quan",
  "huyen",
  "thanh",
  "pho",
  "tp",
  "va",
  "co",
  "nhung",
  "theo",
  "ve",
  "san",
  "du",
  "lieu",
  "biet",
  "vung",
  "nao",
  "so",
  "toa",
  "cua",
  "thuoc",
  "la",
  "bao",
  "nhieu",
  "dem",
  "tong",
  "may",
  "mat",
  "do",
  "day",
  "dac",
  "nhat"
]);

const DANANG_DISTRICTS = [
  "cam le",
  "hai chau",
  "hoa vang",
  "lien chieu",
  "ngu hanh son",
  "son tra",
  "thanh khe"
];

@Injectable()
export class PropertiesService {
  constructor(@Inject(PrismaService) private readonly prisma: PropertiesPrisma) {}

  async searchProperties(input: PropertySearchInput = {}) {
    const limit = this.validLimit(input.limit);
    const intent = this.searchIntent(input.query);
    const tokens = this.searchTokens(input.query);
    const where = this.searchWhere(input, tokens, intent);
    const densityRegions =
      intent.type === "density"
        ? await this.densityRegions(intent, tokens, DEFAULT_DENSITY_REGION_LIMIT)
        : [];
    const total = await this.prisma.buildingProperty.count({ where });
    let rows = (await this.prisma.buildingProperty.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: Math.min(MAX_LIMIT, limit + 15)
    })) as BuildingPropertyRow[];
    let rankedRows = this.rankRows(rows, tokens).slice(0, limit);

    if (rankedRows.length === 0 && tokens.length > 0 && intent.type === "list") {
      rows = (await this.prisma.buildingProperty.findMany({
        where: this.fuzzySearchWhere(input, tokens),
        orderBy: [{ updatedAt: "desc" }],
        take: MAX_LIMIT
      })) as BuildingPropertyRow[];
      rankedRows = this.rankRows(rows, tokens).slice(0, limit);
    }

    const answer =
      intent.type === "count" || intent.type === "density"
        ? this.searchAnswer(total, intent, densityRegions)
        : undefined;
    const map =
      intent.type === "density"
        ? {
            type: "property-density",
            regions: densityRegions
          }
        : undefined;

    return {
      items: rankedRows,
      answer,
      map,
      meta: {
        limit,
        tokens,
        normalizedQuery: normalizeSearchText(input.query || ""),
        searchMode:
          intent.type === "density"
            ? "postgres-normalized-vietnamese-nl-fuzzy-density"
            : intent.type === "count"
            ? "postgres-normalized-vietnamese-nl"
            : "postgres-normalized-lexical",
        semanticModel: "paraphrase-multilingual-MiniLM-L12-v2-ready"
      }
    };
  }

  async getProperty(id: string) {
    const property = await this.findProperty(id);
    return property;
  }

  async createProperty(input: PropertyMutationInput, actorUserId?: string) {
    const count = await this.prisma.buildingProperty.count({ where: {} });
    const data = this.propertyData(input, {
      code: input.code || this.formatCode(count + 1),
      city: input.city || DEFAULT_CITY,
      propertyType: input.propertyType || DEFAULT_PROPERTY_TYPE,
      source: input.source || DEFAULT_SOURCE,
      status: input.status || DEFAULT_STATUS
    });
    const created = (await this.prisma.buildingProperty.create({ data })) as BuildingPropertyRow;

    await this.writeAudit(actorUserId, "properties.create", created.id, {
      code: created.code
    });

    return created;
  }

  async updateProperty(id: string, input: PropertyMutationInput, actorUserId?: string) {
    const existing = await this.findProperty(id);
    const data = this.propertyData(input, {
      code: existing.code,
      city: existing.city || DEFAULT_CITY,
      propertyType: existing.propertyType || DEFAULT_PROPERTY_TYPE,
      source: existing.source || DEFAULT_SOURCE,
      status: (existing.status as PropertyStatus) || DEFAULT_STATUS,
      existing
    });
    const updated = (await this.prisma.buildingProperty.update({
      where: { id },
      data
    })) as BuildingPropertyRow;

    await this.writeAudit(actorUserId, "properties.update", id, {
      code: updated.code
    });

    return updated;
  }

  async deleteProperty(id: string, actorUserId?: string) {
    await this.findProperty(id);
    const deleted = await this.prisma.buildingProperty.update({
      where: { id },
      data: { deletedAt: new Date(), status: "ARCHIVED" }
    });

    await this.writeAudit(actorUserId, "properties.delete", id);
    return deleted;
  }

  async importOvertureBuildings(features: unknown, options: ImportOptions = {}) {
    if (!Array.isArray(features)) {
      throw new BadRequestException("Overture import payload must be an array");
    }

    let imported = 0;
    let skipped = 0;
    const baseCount = await this.prisma.buildingProperty.count({ where: {} });

    for (const feature of features) {
      const data = this.overtureFeatureData(
        feature as OvertureFeature,
        this.formatCode(baseCount + imported + 1),
        options
      );

      if (!data) {
        skipped += 1;
        continue;
      }

      await this.prisma.buildingProperty.upsert({
        where: { overtureId: data.overtureId },
        update: this.withoutCode(data),
        create: data
      });
      imported += 1;
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: options.actorUserId,
        action: "properties.import.overture",
        entityType: "BuildingProperty",
        entityId: null,
        metadata: {
          imported,
          skipped,
          sourceVersion: options.sourceVersion
        }
      }
    });

    return { imported, skipped };
  }

  private async findProperty(id: string) {
    const property = (await this.prisma.buildingProperty.findUnique({
      where: { id }
    })) as BuildingPropertyRow | null;

    if (!property || property.deletedAt) {
      throw new NotFoundException("Property not found");
    }

    return property;
  }

  private searchWhere(input: PropertySearchInput, tokens: string[], intent: SearchIntent) {
    const where: Record<string, unknown> = { deletedAt: null };
    const andFilters: Record<string, unknown>[] = [];

    this.addNormalizedPhraseFilter(andFilters, intent.filters.ward);
    this.addNormalizedPhraseFilter(andFilters, intent.filters.district);
    this.addNormalizedTokenFilters(andFilters, tokens);
    this.addNormalizedPhraseFilter(andFilters, input.street);
    this.addNormalizedPhraseFilter(andFilters, input.ward);
    this.addNormalizedPhraseFilter(andFilters, input.district);

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    if (input.status && VALID_STATUSES.has(input.status as PropertyStatus)) {
      where.status = input.status;
    }

    return where;
  }

  private fuzzySearchWhere(input: PropertySearchInput, tokens: string[]) {
    const where: Record<string, unknown> = { deletedAt: null };
    const candidates = [...new Set(tokens.flatMap((token) => [token, token.slice(0, 4)]))]
      .filter((token) => token.length >= 3)
      .map((token) => ({ searchTextNormalized: { contains: token } }));

    if (candidates.length > 0) {
      where.OR = candidates;
    }

    if (input.status && VALID_STATUSES.has(input.status as PropertyStatus)) {
      where.status = input.status;
    }

    return where;
  }

  private addNormalizedPhraseFilter(andFilters: Record<string, unknown>[], value?: string) {
    const normalized = normalizeSearchText(value || "");

    if (!normalized) {
      return;
    }

    if (!andFilters.some((filter) => this.isSameSearchTokenFilter(filter, normalized))) {
      andFilters.push({ searchTextNormalized: { contains: normalized } });
    }
  }

  private addNormalizedTokenFilters(andFilters: Record<string, unknown>[], tokens: string[]) {
    for (const token of tokens) {
      this.addNormalizedPhraseFilter(andFilters, token);
    }
  }

  private rankRows(rows: BuildingPropertyRow[], tokens: string[]) {
    if (tokens.length === 0) {
      return rows;
    }

    return rows
      .map((row) => ({
        row,
        score: tokens.reduce((score, token) => {
          const text = row.searchTextNormalized || "";
          if (text.includes(token)) {
            return score + 1;
          }

          return score + this.bestFuzzyTokenScore(text, token);
        }, 0)
      }))
      .filter((item) => item.score >= this.minimumSearchScore(tokens))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.row);
  }

  private minimumSearchScore(tokens: string[]) {
    return tokens.length > 1 ? 1.5 : 0.5;
  }

  private bestFuzzyTokenScore(text: string, token: string) {
    if (token.length < 4) {
      return 0;
    }

    const words = text.split(" ").filter((word) => Math.abs(word.length - token.length) <= 1);
    const bestDistance = words.reduce(
      (best, word) => Math.min(best, levenshteinDistance(word, token)),
      Number.POSITIVE_INFINITY
    );

    return bestDistance <= 1 ? 0.65 : 0;
  }

  private searchIntent(query?: string): SearchIntent {
    const normalizedQuery = normalizeSearchText(query || "");
    const locationAfterAt = this.extractPhraseAfter(normalizedQuery, "o", [
      "co",
      "la",
      "thuoc",
      "quan",
      "huyen",
      "bao",
      "so",
      "mat",
      "day"
    ]);
    const district =
      this.matchKnownDistrict(normalizedQuery) ||
      this.extractPhraseAfter(normalizedQuery, "quan", ["la", "co", "bao", "so"]) ||
      this.extractPhraseAfter(normalizedQuery, "huyen", ["la", "co", "bao", "so"]) ||
      this.extractPhraseAfter(normalizedQuery, "thuoc", ["la", "co", "bao", "so"]);
    const wardFromMarker = this.extractPhraseAfter(normalizedQuery, "phuong", [
      "thuoc",
      "quan",
      "huyen",
      "tai",
      "o",
      "la",
      "co",
      "bao",
      "so"
    ]);
    const locationIsKnownDistrict = locationAfterAt
      ? DANANG_DISTRICTS.includes(locationAfterAt)
      : false;
    const filters = {
      ward: wardFromMarker || (locationIsKnownDistrict ? undefined : locationAfterAt),
      district: district || (locationIsKnownDistrict ? locationAfterAt : undefined)
    };

    return {
      type: this.isDensityQuestion(normalizedQuery)
        ? "density"
        : this.isCountQuestion(normalizedQuery)
          ? "count"
          : "list",
      filters
    };
  }

  private isDensityQuestion(normalizedQuery: string) {
    if (!normalizedQuery) {
      return false;
    }

    const asksForDensity =
      normalizedQuery.includes("day dac") ||
      normalizedQuery.includes("mat do") ||
      normalizedQuery.includes("dong nhat") ||
      normalizedQuery.includes("nhieu nhat");
    const asksForArea = /\b(vung|khu|noi|cho)\b/.test(normalizedQuery);
    const asksForBuildings = /\b(toa nha|can nha|nha|building|bat dong san)\b/.test(
      normalizedQuery
    );

    return asksForDensity && asksForArea && asksForBuildings;
  }

  private isCountQuestion(normalizedQuery: string) {
    if (!normalizedQuery) {
      return false;
    }

    const asksForCount =
      /\b(so|dem|tong|bao nhieu|may)\b/.test(normalizedQuery) ||
      normalizedQuery.includes("bao nhieu");
    const asksForBuildings = /\b(toa nha|can nha|nha|building|bat dong san)\b/.test(
      normalizedQuery
    );

    return asksForCount && asksForBuildings;
  }

  private extractPhraseAfter(normalizedQuery: string, marker: string, stopMarkers: string[]) {
    const padded = ` ${normalizedQuery} `;
    const markerText = ` ${marker} `;
    const markerIndex = padded.indexOf(markerText);

    if (markerIndex < 0) {
      return undefined;
    }

    const phraseStart = markerIndex + markerText.length;
    const remainder = padded.slice(phraseStart);
    const stopIndex = stopMarkers
      .map((stopMarker) => remainder.indexOf(` ${stopMarker} `))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)[0];
    const phrase = (stopIndex === undefined ? remainder : remainder.slice(0, stopIndex)).trim();
    const tokens = phrase.split(" ").filter((token) => token && !STOP_WORDS.has(token));

    return tokens.length > 0 ? tokens.join(" ") : undefined;
  }

  private matchKnownDistrict(normalizedQuery: string) {
    return DANANG_DISTRICTS.find((district) => normalizedQuery.includes(district));
  }

  private async densityRegions(
    intent: SearchIntent,
    tokens: string[],
    limit: number
  ): Promise<PropertyDensityRegion[]> {
    if (!this.prisma.$queryRawUnsafe) {
      return [];
    }

    const terms = this.densitySearchTerms(intent, tokens);
    const filters = terms.map((_, index) => `"searchTextNormalized" LIKE $${index + 3}`);
    const whereSql = filters.length > 0 ? `AND ${filters.join(" AND ")}` : "";
    const sql = `
      WITH filtered AS (
        SELECT
          "centroidLat",
          "centroidLng",
          "ward",
          "district"
        FROM "BuildingProperty"
        WHERE "deletedAt" IS NULL
          AND "centroidLat" IS NOT NULL
          AND "centroidLng" IS NOT NULL
          ${whereSql}
      ),
      cells AS (
        SELECT
          FLOOR("centroidLat" / $1)::INTEGER AS lat_cell,
          FLOOR("centroidLng" / $2)::INTEGER AS lng_cell,
          COUNT(*)::INTEGER AS count,
          AVG("centroidLat")::DOUBLE PRECISION AS center_lat,
          AVG("centroidLng")::DOUBLE PRECISION AS center_lng,
          MIN("centroidLat")::DOUBLE PRECISION AS min_lat,
          MIN("centroidLng")::DOUBLE PRECISION AS min_lng,
          MAX("centroidLat")::DOUBLE PRECISION AS max_lat,
          MAX("centroidLng")::DOUBLE PRECISION AS max_lng,
          MIN("ward") AS ward,
          MIN("district") AS district
        FROM filtered
        GROUP BY lat_cell, lng_cell
      )
      SELECT
        concat(lat_cell, ':', lng_cell) AS "cellId",
        count,
        center_lat AS "centerLat",
        center_lng AS "centerLng",
        min_lat AS "minLat",
        min_lng AS "minLng",
        max_lat AS "maxLat",
        max_lng AS "maxLng",
        ward,
        district
      FROM cells
      ORDER BY count DESC, center_lat ASC, center_lng ASC
      LIMIT $${terms.length + 3}
    `;
    const rows = await this.prisma.$queryRawUnsafe<DensityRegionRow[]>(
      sql,
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      ...terms.map((term) => `%${term}%`),
      limit
    );

    return rows.map((row, index) => this.densityRegion(row, index));
  }

  private densitySearchTerms(intent: SearchIntent, tokens: string[]) {
    const terms = [intent.filters.ward, intent.filters.district, ...tokens].filter(
      (term): term is string => Boolean(term && term.length >= 3)
    );

    return [...new Set(terms.map((term) => normalizeSearchText(term)))];
  }

  private densityRegion(row: DensityRegionRow, index: number): PropertyDensityRegion {
    const centerLat = this.roundCoordinate(Number(row.centerLat));
    const centerLng = this.roundCoordinate(Number(row.centerLng));
    const south = this.roundCoordinate(Number(row.minLat));
    const west = this.roundCoordinate(Number(row.minLng));
    const north = this.roundCoordinate(Number(row.maxLat));
    const east = this.roundCoordinate(Number(row.maxLng));
    const ward = this.cleanString(row.ward);
    const district = this.cleanString(row.district);

    return {
      id: String(row.cellId || `density-${index + 1}`),
      label: [ward, district].filter(Boolean).join(", ") || `Vung ${index + 1}`,
      count: Number(row.count || 0),
      center: { lat: centerLat, lng: centerLng },
      bbox: { south, west, north, east },
      ward,
      district
    };
  }

  private searchAnswer(
    count: number,
    intent: SearchIntent,
    densityRegions: PropertyDensityRegion[] = []
  ): PropertySearchAnswer {
    const filterText = [
      intent.filters.ward ? `phường ${intent.filters.ward}` : undefined,
      intent.filters.district ? `quận/huyện ${intent.filters.district}` : undefined
    ]
      .filter(Boolean)
      .join(", ");
    const topRegion = densityRegions[0];

    if (intent.type === "density") {
      return {
        type: "density",
        count,
        filters: intent.filters,
        topRegion,
        text: topRegion
          ? `Vùng dày đặc nhất có ${topRegion.count.toLocaleString("vi-VN")} tòa nhà tại ${topRegion.label}.`
          : `Không tìm thấy vùng mật độ nhà phù hợp${filterText ? ` tại ${filterText}` : ""}.`
      };
    }

    return {
      type: "count",
      count,
      filters: intent.filters,
      text: `Có ${count.toLocaleString("vi-VN")} tòa nhà${filterText ? ` tại ${filterText}` : ""}.`
    };
  }

  private isSameSearchTokenFilter(filter: Record<string, unknown>, token: string) {
    const normalizedFilter = filter.searchTextNormalized as { contains?: string } | undefined;
    return normalizedFilter?.contains === token;
  }

  private propertyData(
    input: PropertyMutationInput,
    defaults: {
      code?: string;
      city: string;
      propertyType: string;
      source: string;
      status: PropertyStatus;
      existing?: BuildingPropertyRow;
    }
  ) {
    const candidate = this.sanitizedPropertyInput(input, defaults);
    const searchText = this.searchableText(candidate);

    return {
      ...candidate,
      searchText,
      searchTextNormalized: normalizeSearchText(searchText)
    };
  }

  private sanitizedPropertyInput(
    input: PropertyMutationInput,
    defaults: {
      code?: string;
      city: string;
      propertyType: string;
      source: string;
      status: PropertyStatus;
      existing?: BuildingPropertyRow;
    }
  ) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new BadRequestException("Property payload must be an object");
    }

    const existing = (defaults.existing || {}) as Partial<BuildingPropertyRow>;
    const status = input.status || defaults.status;

    if (!VALID_STATUSES.has(status)) {
      throw new BadRequestException("Property status is invalid");
    }

    const centroidLat = this.validLatitude(input.centroidLat ?? existing.centroidLat);
    const centroidLng = this.validLongitude(input.centroidLng ?? existing.centroidLng);
    const height = this.validOptionalNumber(input.height ?? existing.height, "height");
    const areaSqm = this.validOptionalNumber(input.areaSqm ?? existing.areaSqm, "areaSqm");
    const level = this.validOptionalNumber(input.level ?? existing.level, "level");
    const floors = this.validOptionalInteger(input.floors ?? existing.floors, "floors");

    return {
      code: this.cleanString(input.code) || defaults.code,
      overtureId: this.cleanString(input.overtureId) ?? existing.overtureId,
      name: this.cleanString(input.name) ?? existing.name,
      addressLine: this.cleanString(input.addressLine) ?? existing.addressLine,
      street: this.cleanString(input.street) ?? existing.street,
      ward: this.cleanString(input.ward) ?? existing.ward,
      district: this.cleanString(input.district) ?? existing.district,
      city: this.cleanString(input.city) || existing.city || defaults.city,
      propertyType:
        this.cleanString(input.propertyType) || existing.propertyType || defaults.propertyType,
      status,
      source: this.cleanString(input.source) || existing.source || defaults.source,
      sourceVersion: this.cleanString(input.sourceVersion) ?? existing.sourceVersion,
      level,
      height,
      floors,
      areaSqm,
      centroidLat,
      centroidLng,
      bbox: input.bbox ?? existing.bbox,
      geometry: input.geometry ?? existing.geometry,
      attributes: input.attributes ?? existing.attributes,
      embedding: input.embedding
    };
  }

  private overtureFeatureData(
    feature: OvertureFeature,
    code: string,
    options: ImportOptions
  ) {
    const properties = this.featureProperties(feature);
    const overtureId = this.cleanString(feature.id) || this.cleanString(properties.id);

    if (!overtureId) {
      return null;
    }

    const bbox = this.readBbox(feature.bbox ?? properties.bbox);
    const geometry = feature.geometry ?? properties.geometry;
    const centroid = this.centroidFromBbox(bbox) || this.centroidFromGeometry(geometry);
    const name = this.primaryName(feature.names ?? properties.names);
    const sourceVersion = options.sourceVersion || this.cleanString(properties.version);

    return this.propertyData(
      {
        code,
        overtureId,
        name,
        addressLine: this.cleanString(properties.addressLine ?? properties.address_line),
        street: this.cleanString(properties.street),
        ward: this.cleanString(properties.ward) || options.defaultWard,
        district: this.cleanString(properties.district) || options.defaultDistrict,
        city: DEFAULT_CITY,
        propertyType: DEFAULT_PROPERTY_TYPE,
        status: DEFAULT_STATUS,
        source: OVERTURE_SOURCE,
        sourceVersion,
        level: this.numberValue(properties.level),
        height: this.numberValue(properties.height),
        floors: this.integerValue(properties.num_floors),
        areaSqm: this.numberValue(properties.areaSqm ?? properties.area_sqm),
        centroidLat: centroid?.lat,
        centroidLng: centroid?.lng,
        bbox,
        geometry,
        attributes: properties
      },
      {
        code,
        city: DEFAULT_CITY,
        propertyType: DEFAULT_PROPERTY_TYPE,
        source: OVERTURE_SOURCE,
        status: DEFAULT_STATUS
      }
    );
  }

  private featureProperties(feature: OvertureFeature) {
    return {
      ...feature,
      ...(feature.properties || {})
    } as Record<string, unknown>;
  }

  private primaryName(value: unknown) {
    if (!value) {
      return undefined;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const item = value as { primary?: unknown; common?: unknown };
      return this.cleanString(item.primary) || this.cleanString(item.common);
    }

    const text = this.cleanString(value);
    const match = text?.match(/primary['"]?\s*:\s*['"]([^'"]+)['"]/);
    return match?.[1] || text;
  }

  private readBbox(value: unknown) {
    if (Array.isArray(value) && value.length === 4) {
      const [xmin, ymin, xmax, ymax] = value.map((item) => Number(item));
      return this.validBbox({ xmin, ymin, xmax, ymax });
    }

    if (value && typeof value === "object") {
      const bbox = value as Record<string, unknown>;
      return this.validBbox({
        xmin: Number(bbox.xmin),
        ymin: Number(bbox.ymin),
        xmax: Number(bbox.xmax),
        ymax: Number(bbox.ymax)
      });
    }

    return undefined;
  }

  private validBbox(bbox: { xmin: number; ymin: number; xmax: number; ymax: number }) {
    if (
      [bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax].every(Number.isFinite) &&
      bbox.xmin <= bbox.xmax &&
      bbox.ymin <= bbox.ymax
    ) {
      return bbox;
    }

    return undefined;
  }

  private centroidFromBbox(bbox?: { xmin: number; ymin: number; xmax: number; ymax: number }) {
    if (!bbox) {
      return null;
    }

    return {
      lat: this.roundCoordinate((bbox.ymin + bbox.ymax) / 2),
      lng: this.roundCoordinate((bbox.xmin + bbox.xmax) / 2)
    };
  }

  private centroidFromGeometry(geometry: unknown) {
    const points = this.geometryPoints(geometry);

    if (points.length === 0) {
      return null;
    }

    const lng = points.reduce((sum, point) => sum + point[0], 0) / points.length;
    const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length;

    return {
      lat: this.roundCoordinate(lat),
      lng: this.roundCoordinate(lng)
    };
  }

  private geometryPoints(geometry: unknown) {
    if (!geometry || typeof geometry !== "object") {
      return [];
    }

    const coordinates = (geometry as { coordinates?: unknown }).coordinates;
    const points: Array<[number, number]> = [];
    this.collectCoordinatePairs(coordinates, points);
    return points;
  }

  private collectCoordinatePairs(value: unknown, points: Array<[number, number]>) {
    if (!Array.isArray(value)) {
      return;
    }

    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      points.push([value[0], value[1]]);
      return;
    }

    for (const item of value) {
      this.collectCoordinatePairs(item, points);
    }
  }

  private withoutCode(data: Record<string, unknown>) {
    const { code, ...rest } = data;
    void code;
    return rest;
  }

  private searchableText(property: Record<string, unknown>) {
    return [
      property.code,
      property.overtureId,
      property.name,
      property.addressLine,
      property.street,
      property.ward,
      property.district,
      property.city,
      property.propertyType,
      property.status,
      property.source
    ]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join(" ");
  }

  private searchTokens(query?: string) {
    return normalizeSearchText(query || "")
      .replace(/\bso luong\b/g, " ")
      .split(" ")
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  }

  private validLimit(limit?: number) {
    const numericLimit = Number(limit || DEFAULT_LIMIT);

    if (!Number.isFinite(numericLimit)) {
      return DEFAULT_LIMIT;
    }

    return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(numericLimit)));
  }

  private validLatitude(value: unknown) {
    if (value === undefined || value === null) {
      return undefined;
    }

    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue >= -90 && numericValue <= 90) {
      return numericValue;
    }

    throw new BadRequestException("Property latitude is invalid");
  }

  private validLongitude(value: unknown) {
    if (value === undefined || value === null) {
      return undefined;
    }

    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue >= -180 && numericValue <= 180) {
      return numericValue;
    }

    throw new BadRequestException("Property longitude is invalid");
  }

  private validOptionalNumber(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return undefined;
    }

    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue >= 0) {
      return numericValue;
    }

    throw new BadRequestException(`Property ${field} is invalid`);
  }

  private validOptionalInteger(value: unknown, field: string) {
    const numericValue = this.validOptionalNumber(value, field);

    if (numericValue === undefined) {
      return undefined;
    }

    if (Number.isInteger(numericValue)) {
      return numericValue;
    }

    throw new BadRequestException(`Property ${field} must be an integer`);
  }

  private numberValue(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  private integerValue(value: unknown) {
    const numericValue = this.numberValue(value);
    return numericValue === undefined ? undefined : Math.trunc(numericValue);
  }

  private cleanString(value: unknown) {
    if (typeof value !== "string" && typeof value !== "number") {
      return undefined;
    }

    const text = String(value).trim();
    return text.length > 0 ? text : undefined;
  }

  private formatCode(sequence: number) {
    return `DN-BLD-${String(sequence).padStart(6, "0")}`;
  }

  private roundCoordinate(value: number) {
    return Number(value.toFixed(6));
  }

  private writeAudit(
    actorUserId: string | undefined,
    action: string,
    entityId: string,
    metadata?: Record<string, unknown>
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: "BuildingProperty",
        entityId,
        metadata
      }
    });
  }
}

export function normalizeSearchText(value: string) {
  return addCaseSpaces(value)
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function addCaseSpaces(value: string) {
  const chars: string[] = [];
  let previous = "";

  for (const char of value) {
    if (previous && isLowercaseLetter(previous) && isUppercaseLetter(char)) {
      chars.push(" ");
    }

    chars.push(char);
    previous = char;
  }

  return chars.join("");
}

function isLowercaseLetter(value: string) {
  return value.toLocaleLowerCase("vi") === value && value.toLocaleUpperCase("vi") !== value;
}

function isUppercaseLetter(value: string) {
  return value.toLocaleUpperCase("vi") === value && value.toLocaleLowerCase("vi") !== value;
}

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    let lastDiagonal = previous[0];
    previous[0] = leftIndex + 1;

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const oldDiagonal = previous[rightIndex + 1];
      const cost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      previous[rightIndex + 1] = Math.min(
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + 1,
        lastDiagonal + cost
      );
      lastDiagonal = oldDiagonal;
    }
  }

  return previous[right.length];
}
