import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
import { BetterSqliteService } from "../prisma/better-sqlite.service";
import { PrismaService } from "../prisma/prisma.service";
import { ElasticsearchPropertySearchProvider } from "./elasticsearch-property-search.provider";
import { PropertySearchProvider } from "./property-search-provider";

type Delegate = {
  findMany?: (args: unknown) => Promise<unknown[]>;
  findUnique?: (args: unknown) => Promise<unknown>;
  count?: (args?: unknown) => Promise<number>;
  create?: (args: unknown) => Promise<unknown>;
  update?: (args: unknown) => Promise<unknown>;
  upsert?: (args: unknown) => Promise<unknown>;
};

type PropertiesPrisma = {
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
  objects?: PropertyDensityObject[];
};

type PropertySearchMap = {
  type: "property-density";
  regions: PropertyDensityRegion[];
};

type PropertyDensityObject = {
  id: string;
  type: "building";
  center?: {
    lat: number;
    lng: number;
  };
  bbox?: [number, number, number, number];
  geometry?: unknown;
  geometrySource: "overture_property_search";
  properties: {
    code?: string;
    name?: string | null;
    ward?: string | null;
    district?: string | null;
    source?: string | null;
  };
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
  direction?: "highest" | "lowest";
  filters: {
    ward?: string;
    district?: string;
    status?: PropertyStatus;
    propertyType?: string;
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
  cellSouth?: number;
  cellWest?: number;
  cellNorth?: number;
  cellEast?: number;
  ward?: string | null;
  district?: string | null;
};

export type PropertySearchInput = {
  query?: string;
  street?: string;
  ward?: string;
  district?: string;
  status?: string;
  propertyType?: string;
  source?: string;
  updatedFrom?: string;
  updatedTo?: string;
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

export type AssetImportResult = {
  imported: number;
  skipped: number;
  failedRows: Array<{
    rowNumber: number;
    code?: string;
    errors: string[];
  }>;
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
const DEFAULT_DENSITY_OBJECT_LIMIT = 350;
const DENSITY_BACKEND_TIMEOUT_MS = Number(process.env.DENSITY_BACKEND_TIMEOUT_MS || 5000);
const SEMANTIC_PROVIDER_TIMEOUT_MS = Number(process.env.SEMANTIC_PROVIDER_TIMEOUT_MS || 2500);
const LIST_SEARCH_TIMEOUT_MS = Number(process.env.LIST_SEARCH_TIMEOUT_MS || 2000);
const DEFAULT_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
const VALID_STATUSES = new Set<PropertyStatus>([
  "ACTIVE",
  "INACTIVE",
  "REVIEW",
  "ARCHIVED"
]);
export const STOP_WORDS_FOR_TOKENS = new Set([
  "cho",
  "toi",
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
  "nhat",
  "tim",
  "dang",
  "hoat",
  "dong",
  "khong",
  "can",
  "xem",
  "xet",
  "luu",
  "tru",
  "building"
]);

const LOWEST_DENSITY_PHRASES = ["thua thot", "it nha", "it nhat", "vang nha", "vang", "thap nhat"];
const HIGHEST_DENSITY_PHRASES = [
  "day dac",
  "mat do",
  "dong nhat",
  "nhieu nhat",
  "dong duc",
  "nhieu nha nhat",
  "cao nhat"
];
const DENSITY_INTENT_KEYWORDS = [...HIGHEST_DENSITY_PHRASES, ...LOWEST_DENSITY_PHRASES];
export const INTENT_KEYWORDS = new Set([
  ...DENSITY_INTENT_KEYWORDS,
  "bao nhieu",
  "so luong",
  "toa nha",
  "can nha",
  "bat dong san"
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

type PropertiesServiceOptions = {
  elasticsearchProvider?: PropertySearchProvider;
  propertySearchProvider?: "postgres" | "elasticsearch";
};
export const PROPERTIES_SERVICE_OPTIONS = "PROPERTIES_SERVICE_OPTIONS";

@Injectable()
export class PropertiesService {
  private readonly configuredElasticsearchProvider?: PropertySearchProvider;
  private readonly propertySearchProvider?: "postgres" | "elasticsearch";
  private locationNameCache?: {
    wards: Map<string, string>;
    districts: Map<string, string>;
  };

  constructor(
    @Inject(PrismaService) private readonly prisma: PropertiesPrisma,
    @Optional() @Inject(BetterSqliteService) private readonly sqlite?: BetterSqliteService,
    @Optional()
    @Inject(PROPERTIES_SERVICE_OPTIONS)
    options: PropertiesServiceOptions = {}
  ) {
    this.configuredElasticsearchProvider = options?.elasticsearchProvider;
    this.propertySearchProvider = options?.propertySearchProvider;
  }

  async searchProperties(input: PropertySearchInput = {}): Promise<any> {
    const limit = this.validLimit(input.limit);

    if (input.query) {
      const coordMatch = input.query.trim().match(/^([+-]?\d+\.\d+),\s*([+-]?\d+\.\d+)$/);
      if (coordMatch) {
        const val1 = parseFloat(coordMatch[1]);
        const val2 = parseFloat(coordMatch[2]);
        let lat = val1, lng = val2;
        
        if (Math.abs(val1) > 90) {
          lat = val2;
          lng = val1;
        }

        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return {
            items: [],
            answer: { type: "coordinate", text: `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}` },
            map: {
              type: "focus",
              center: { lat, lng }
            },
            meta: { limit, tokens: [], searchMode: "coordinate" }
          };
        }
      }
    }

    const intent = this.searchIntent(input.query);
    const tokens = this.searchTokens(input.query);
    const source = this.searchSource(input.source);

    if (this.shouldUseElasticsearch(intent, input, tokens)) {
      try {
        const providerResult = await this.withSemanticProviderTimeout(
          this.elasticsearchProvider().search({
            query: input.query,
            status: this.searchStatus(input.status, intent),
            propertyType: this.searchPropertyType(input.propertyType, intent),
            source,
            limit,
            tokens,
            normalizedQuery: normalizeSearchText(input.query || ""),
            filters: {
              ward: intent.filters.ward,
              district: intent.filters.district
            }
          })
        );

        return {
          items: providerResult.items,
          meta: {
            limit,
            tokens,
            normalizedQuery: normalizeSearchText(input.query || ""),
            searchMode: providerResult.searchMode,
            semanticModel: providerResult.semanticModel || DEFAULT_EMBEDDING_MODEL,
            ambiguityWarning: this.ambiguityWarning(input.query, intent, tokens)
          }
        };
      } catch (error) {
        const result = await this.searchPropertiesPostgres(input, limit, intent, tokens, source);
        const warning = this.semanticSearchFallbackWarning(error);
        return {
          ...result,
          meta: {
            ...result.meta,
            warnings: [
              ...(result.meta.warnings || []),
              warning
            ]
          }
        };
      }
    }

    return this.searchPropertiesPostgres(input, limit, intent, tokens, source);
  }

  private async searchPropertiesPostgres(
    input: PropertySearchInput,
    limit: number,
    intent: SearchIntent,
    tokens: string[],
    source: string
  ) {
    if (intent.type === "density") {
      const locationFilters = this.densityLocationFilters(intent);
      const terms =
        locationFilters.ward || locationFilters.district
          ? []
          : this.densitySearchTerms(intent, tokens);

      if (!this.sqlite) {
        return this.densityFallbackResponse(input, limit, intent, tokens, 0, [
          "BetterSqliteService unavailable for density query."
        ]);
      }

      if (!locationFilters.ward && !locationFilters.district && terms.length === 0) {
        return this.densityFallbackResponse(input, limit, intent, tokens, 0, [
          "Density query requires a ward or district; none detected."
        ]);
      }

      let densityRegions: PropertyDensityRegion[] = [];
      let total = 0;
      let warnings: string[] = [];
      let timedOut = false;

      try {
        [densityRegions, total] = await this.withDensityTimeout(
          Promise.all([
            this.densityRegions(
              intent,
              tokens,
              DEFAULT_DENSITY_REGION_LIMIT,
              source,
              locationFilters,
              terms
            ),
            Promise.resolve(this.densityTotal(intent, tokens, source, locationFilters, terms))
          ])
        );
      } catch {
        warnings = ["Density query timed out; please specify ward or district."];
        timedOut = true;
      }

      if (timedOut) {
        return this.densityFallbackResponse(input, limit, intent, tokens, 0, warnings, true);
      }

      return {
        items: [],
        answer: this.searchAnswer(total, intent, densityRegions),
        map: {
          type: "property-density",
          regions: densityRegions
        },
        meta: {
          limit,
          tokens,
          normalizedQuery: normalizeSearchText(input.query || ""),
          searchMode: "postgres-normalized-vietnamese-nl-fuzzy-density",
          semanticModel: "paraphrase-multilingual-MiniLM-L12-v2-ready",
          warnings: [] as string[],
          densityDirection: intent.direction || "highest",
          timedOut: false,
          total,
          ambiguityWarning: this.ambiguityWarning(input.query, intent, tokens)
        }
      };
    }

    if (intent.type === "list") {
      try {
        return await this.withListSearchTimeout(
          this.searchPropertiesPostgresList(input, limit, intent, tokens, source)
        );
      } catch {
        return this.listSearchFallbackResponse(input, limit, intent, tokens, [
          "Property list search timed out; please narrow the area or query."
        ]);
      }
    }

    const where = this.searchWhere(input, tokens, intent, source);
    const total = await this.prisma.buildingProperty.count({ where });
    const answer = this.searchAnswer(total, intent);

    return {
      items: [],
      answer,
      meta: {
        limit,
        tokens,
        normalizedQuery: normalizeSearchText(input.query || ""),
        searchMode: "postgres-normalized-vietnamese-nl",
        semanticModel: "paraphrase-multilingual-MiniLM-L12-v2-ready",
        warnings: [] as string[],
        total,
        ambiguityWarning: this.ambiguityWarning(input.query, intent, tokens)
      }
    };
  }

  private async searchPropertiesPostgresList(
    input: PropertySearchInput,
    limit: number,
    intent: SearchIntent,
    tokens: string[],
    source: string
  ) {
    const sqliteResult = this.searchPropertiesSqliteList(input, limit, intent, tokens, source);
    if (sqliteResult) {
      return sqliteResult;
    }

    const where = this.searchWhere(input, tokens, intent, source);
    let rows = (await this.prisma.buildingProperty.findMany({
      where,
      select: this.selectLightPropertyFields(),
      orderBy: [{ updatedAt: "desc" }],
      take: Math.min(MAX_LIMIT, limit + 15)
    })) as BuildingPropertyRow[];
    let rankedRows = this.rankRows(rows, tokens).slice(0, limit);

    if (rankedRows.length === 0 && tokens.length > 0) {
      rows = (await this.prisma.buildingProperty.findMany({
        where: this.fuzzySearchWhere(input, tokens, source, intent),
        select: this.selectLightPropertyFields(),
        orderBy: [{ updatedAt: "desc" }],
        take: MAX_LIMIT
      })) as BuildingPropertyRow[];
      rankedRows = this.rankRows(rows, tokens).slice(0, limit);
    }

    return {
      items: rankedRows,
      meta: {
        limit,
        tokens,
        normalizedQuery: normalizeSearchText(input.query || ""),
        searchMode: "postgres-normalized-lexical",
        semanticModel: "paraphrase-multilingual-MiniLM-L12-v2-ready",
        warnings: [] as string[],
        total: rankedRows.length,
        ambiguityWarning: this.ambiguityWarning(input.query, intent, tokens)
      }
    };
  }

  private searchPropertiesSqliteList(
    input: PropertySearchInput,
    limit: number,
    intent: SearchIntent,
    tokens: string[],
    source: string
  ) {
    if (
      !this.sqlite ||
      !this.isExplicitListQuery(input.query) ||
      !this.shouldUseExactLocationColumns(intent)
    ) {
      return undefined;
    }

    const exactFilters = [
      intent.filters.ward ? `AND "ward" = ?` : "",
      intent.filters.district ? `AND "district" = ?` : ""
    ].join(" ");
    const rows = this.sqlite.all<BuildingPropertyRow>(
      `
        SELECT
          "id",
          "code",
          "overtureId",
          "name",
          "addressLine",
          "street",
          "ward",
          "district",
          "city",
          "propertyType",
          "status",
          "source",
          "sourceVersion",
          "level",
          "height",
          "floors",
          "areaSqm",
          "centroidLat",
          "centroidLng",
          "bbox",
          "searchText",
          "searchTextNormalized",
          "createdAt",
          "updatedAt",
          "deletedAt"
        FROM "BuildingProperty"
        WHERE "deletedAt" IS NULL
          AND "source" = ?
          ${exactFilters}
        LIMIT ?
      `,
      source,
      ...[intent.filters.ward, intent.filters.district].filter(
        (value): value is string => Boolean(value)
      ),
      Math.min(MAX_LIMIT, limit + 15)
    );
    const rankedRows = this.rankRows(rows, tokens).slice(0, limit);

    return {
      items: rankedRows,
      meta: {
        limit,
        tokens,
        normalizedQuery: normalizeSearchText(input.query || ""),
        searchMode: "sqlite-exact-location-list",
        semanticModel: "paraphrase-multilingual-MiniLM-L12-v2-ready",
        warnings: [] as string[],
        total: rankedRows.length,
        ambiguityWarning: this.ambiguityWarning(input.query, intent, tokens)
      }
    };
  }

  private shouldUseElasticsearch(intent: SearchIntent, input: PropertySearchInput, tokens: string[]) {
    const provider = this.propertySearchProvider || process.env.PROPERTY_SEARCH_PROVIDER;
    return (
      provider === "elasticsearch" &&
      intent.type === "list" &&
      Boolean(input.query?.trim()) &&
      !this.isExplicitListQuery(input.query) &&
      tokens.length > 0 &&
      !this.validDateRange(input.updatedFrom, input.updatedTo)
    );
  }

  private isExplicitListQuery(query?: string) {
    const normalizedQuery = normalizeSearchText(query || "");
    return /\b(danh sach|liet ke|hien thi|xem)\b/.test(normalizedQuery);
  }

  private withSemanticProviderTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(`Semantic provider timed out after ${SEMANTIC_PROVIDER_TIMEOUT_MS}ms`)
        );
      }, SEMANTIC_PROVIDER_TIMEOUT_MS);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  private withListSearchTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`PostgreSQL list search timed out after ${LIST_SEARCH_TIMEOUT_MS}ms`));
      }, LIST_SEARCH_TIMEOUT_MS);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  private semanticSearchFallbackWarning(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Embedding service timed out after")) {
      return "MiniLM embedding timed out; used PostgreSQL fallback.";
    }
    if (message.includes("Semantic provider timed out after")) {
      return "Elasticsearch/MiniLM search timed out; used PostgreSQL fallback.";
    }
    if (message.includes("Elasticsearch search timed out after")) {
      return "Elasticsearch search timed out; used PostgreSQL fallback.";
    }
    return "Elasticsearch/MiniLM search unavailable; used PostgreSQL fallback.";
  }

  private elasticsearchProvider() {
    return (
      this.configuredElasticsearchProvider ||
      new ElasticsearchPropertySearchProvider(this.prisma)
    );
  }

  private searchSource(source?: string) {
    return this.cleanString(source) || OVERTURE_SOURCE;
  }

  async getSuggestions(query: string) {
    if (!query || query.trim().length < 2) return [];
    
    const normalized = normalizeSearchText(query);
    const properties = (await this.prisma.buildingProperty.findMany({
      where: {
        deletedAt: null,
        searchTextNormalized: { contains: normalized }
      },
      select: {
        id: true,
        code: true,
        name: true,
        addressLine: true,
        ward: true,
        district: true
      },
      take: 5
    })) as Array<Pick<
      BuildingPropertyRow,
      "id" | "code" | "name" | "addressLine" | "ward" | "district"
    >>;

    return properties.map(p => {
      const addressParts = [p.name, p.addressLine, p.ward, p.district].filter(Boolean);
      return {
        id: p.id,
        text: addressParts.join(", ") || p.code,
        code: p.code
      };
    });
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

  async importAssetRows(rows: unknown, options: ImportOptions = {}): Promise<AssetImportResult> {
    if (!Array.isArray(rows)) {
      throw new BadRequestException("Asset import payload must be an array");
    }

    const candidates = rows.map((row, index) => this.assetImportCandidate(row, index));
    const codes = candidates.map((candidate) => candidate.code).filter(Boolean) as string[];
    const duplicateCodes = new Set<string>();
    const seenCodes = new Set<string>();
    for (const code of codes) {
      if (seenCodes.has(code)) duplicateCodes.add(code);
      seenCodes.add(code);
    }

    const existingRows = codes.length
      ? ((await this.prisma.buildingProperty.findMany({
          where: { code: { in: [...new Set(codes)] }, deletedAt: null },
          select: { code: true }
        })) as Array<{ code?: string | null }>)
      : [];
    const existingCodes = new Set(existingRows.map((row) => row.code).filter(Boolean));

    let imported = 0;
    const failedRows: AssetImportResult["failedRows"] = [];

    for (const candidate of candidates) {
      const errors = [...candidate.errors];
      if (candidate.code && duplicateCodes.has(candidate.code)) errors.push("Duplicate code in file.");
      if (candidate.code && existingCodes.has(candidate.code)) errors.push("Asset code already exists.");

      if (errors.length > 0) {
        failedRows.push({ rowNumber: candidate.rowNumber, code: candidate.code, errors });
        continue;
      }

      const data = this.propertyData(candidate.input, {
        city: DEFAULT_CITY,
        propertyType: DEFAULT_PROPERTY_TYPE,
        source: "manual-import",
        status: DEFAULT_STATUS
      });
      await this.prisma.buildingProperty.create({ data });
      imported += 1;
    }

    const skipped = failedRows.length;
    await this.prisma.auditLog.create({
      data: {
        actorUserId: options.actorUserId,
        action: "properties.import.assets",
        entityType: "BuildingProperty",
        entityId: null,
        metadata: {
          imported,
          skipped,
          failedRows: failedRows.length,
          sourceVersion: options.sourceVersion
        }
      }
    });

    return { imported, skipped, failedRows };
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

  private assetImportCandidate(row: unknown, index: number) {
    const errors: string[] = [];
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return {
        rowNumber: index + 1,
        code: undefined,
        input: {} as PropertyMutationInput,
        errors: ["Import row must be an object."]
      };
    }

    const input = row as PropertyMutationInput;
    const code = this.cleanString(input.code);
    if (!code) errors.push("Code is required.");
    if (!this.cleanString(input.name)) errors.push("Name is required.");
    if (
      (input.centroidLat === undefined || input.centroidLng === undefined) &&
      (input.geometry === undefined || input.geometry === null)
    ) {
      errors.push("Latitude/longitude or geometry is required.");
    }

    return {
      rowNumber: index + 1,
      code,
      input: {
        ...input,
        code,
        source: this.cleanString(input.source) || "manual-import",
        sourceVersion: this.cleanString(input.sourceVersion)
      },
      errors
    };
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

  private searchWhere(
    input: PropertySearchInput,
    tokens: string[],
    intent: SearchIntent,
    source: string
  ) {
    const where: Record<string, unknown> = { deletedAt: null, source };
    const andFilters: Record<string, unknown>[] = [];

    if (this.shouldUseExactLocationColumns(intent)) {
      if (intent.filters.ward) {
        andFilters.push({ ward: intent.filters.ward });
      }
      if (intent.filters.district) {
        andFilters.push({ district: intent.filters.district });
      }
    } else {
      this.addNormalizedPhraseFilter(andFilters, intent.filters.ward);
      this.addNormalizedPhraseFilter(andFilters, intent.filters.district);
    }
    const hasLocationFilter = Boolean(
      intent.filters.ward ||
        intent.filters.district ||
        this.cleanString(input.ward) ||
        this.cleanString(input.district)
    );
    const shouldSkipTokenFilters =
      this.isExplicitListQuery(input.query) && hasLocationFilter && tokens.length <= 2;
    if (!shouldSkipTokenFilters) {
      this.addNormalizedTokenFilters(andFilters, tokens);
    }
    this.addNormalizedPhraseFilter(andFilters, input.street);
    this.addNormalizedPhraseFilter(andFilters, input.ward);
    this.addNormalizedPhraseFilter(andFilters, input.district);

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    if (input.status && VALID_STATUSES.has(input.status as PropertyStatus)) {
      where.status = input.status;
    } else if (intent.filters.status) {
      where.status = intent.filters.status;
    }

    if (input.propertyType || intent.filters.propertyType) {
      where.propertyType = input.propertyType || intent.filters.propertyType;
    }

    const dateRange = this.validDateRange(input.updatedFrom, input.updatedTo);
    if (dateRange) {
      where.updatedAt = dateRange;
    }

    return where;
  }

  private fuzzySearchWhere(
    input: PropertySearchInput,
    tokens: string[],
    source: string,
    intent?: SearchIntent
  ) {
    const where: Record<string, unknown> = { deletedAt: null, source };
    const candidates = [...new Set(tokens.flatMap((token) => [token, token.slice(0, 4)]))]
      .filter((token) => token.length >= 3)
      .map((token) => ({ searchTextNormalized: { contains: token } }));

    if (candidates.length > 0) {
      where.OR = candidates;
    }

    if (input.status && VALID_STATUSES.has(input.status as PropertyStatus)) {
      where.status = input.status;
    } else if (intent?.filters.status) {
      where.status = intent.filters.status;
    }

    if (input.propertyType || intent?.filters.propertyType) {
      where.propertyType = input.propertyType || intent?.filters.propertyType;
    }

    const andFilters: Record<string, unknown>[] = [];
    this.addNormalizedPhraseFilter(andFilters, input.ward);
    this.addNormalizedPhraseFilter(andFilters, input.district);
    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const dateRange = this.validDateRange(input.updatedFrom, input.updatedTo);
    if (dateRange) {
      where.updatedAt = dateRange;
    }

    return where;
  }

  private validDateRange(updatedFrom?: string, updatedTo?: string) {
    const range: Record<string, Date> = {};
    const from = this.validDateBoundary(updatedFrom, false);
    const to = this.validDateBoundary(updatedTo, true);

    if (from) range.gte = from;
    if (to) range.lte = to;

    return Object.keys(range).length > 0 ? range : null;
  }

  private validDateBoundary(value?: string, endOfDay = false) {
    const text = this.cleanString(value);
    if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return null;
    }

    const date = new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
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
    const locationNames = this.locationNames();
    const knownWard = this.matchKnownWard(normalizedQuery, locationNames.wards);
    const knownDistrict = this.matchKnownDistrict(normalizedQuery, locationNames.districts);
    const district =
      knownDistrict ||
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
      ? locationNames.districts.has(locationAfterAt) || DANANG_DISTRICTS.includes(locationAfterAt)
      : false;
    const knownLocationDistrict = locationAfterAt
      ? locationNames.districts.get(locationAfterAt) || locationAfterAt
      : undefined;
    const filters = {
      ward: knownWard || wardFromMarker || (locationIsKnownDistrict ? undefined : locationAfterAt),
      district: district || (locationIsKnownDistrict ? knownLocationDistrict : undefined),
      status: this.matchStatus(normalizedQuery),
      propertyType: this.matchPropertyType(normalizedQuery)
    };

    return {
      type: this.isDensityQuestion(normalizedQuery)
        ? "density"
        : this.isCountQuestion(normalizedQuery)
          ? "count"
          : "list",
      direction: this.densityDirection(normalizedQuery),
      filters
    };
  }

  private isDensityQuestion(normalizedQuery: string) {
    if (!normalizedQuery) {
      return false;
    }

    const asksForDensity = DENSITY_INTENT_KEYWORDS.some((phrase) =>
      normalizedQuery.includes(phrase)
    );
    const asksForArea = /\b(vung|khu|noi|cho)\b/.test(normalizedQuery);
    const asksForBuildings = /\b(toa nha|can nha|nha|building|bat dong san)\b/.test(
      normalizedQuery
    );

    return asksForDensity && (asksForArea || asksForBuildings);
  }

  private densityDirection(normalizedQuery: string): "highest" | "lowest" {
    return LOWEST_DENSITY_PHRASES.some((phrase) => normalizedQuery.includes(phrase))
      ? "lowest"
      : "highest";
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
    const tokens = phrase
      .split(" ")
      .filter((token) => token && !STOP_WORDS_FOR_TOKENS.has(token));

    return tokens.length > 0 ? tokens.join(" ") : undefined;
  }

  private shouldUseExactLocationColumns(intent: SearchIntent) {
    if (!this.sqlite || (!intent.filters.ward && !intent.filters.district)) {
      return false;
    }

    const cache = this.locationNames();
    return Boolean(
      (intent.filters.ward && cache.wards.has(normalizeSearchText(intent.filters.ward))) ||
        (intent.filters.district && cache.districts.has(normalizeSearchText(intent.filters.district)))
    );
  }

  private matchKnownDistrict(normalizedQuery: string, districts: Map<string, string>) {
    const knownDistrict = [...districts.keys()]
      .filter((district) => normalizedQuery.includes(district))
      .sort((a, b) => b.length - a.length)[0];

    return knownDistrict
      ? districts.get(knownDistrict)
      : DANANG_DISTRICTS.find((district) => normalizedQuery.includes(district));
  }

  private matchKnownWard(normalizedQuery: string, wards: Map<string, string>) {
    const knownWard = [...wards.keys()]
      .filter((ward) => normalizedQuery.includes(ward))
      .sort((a, b) => b.length - a.length)[0];

    return knownWard ? wards.get(knownWard) : undefined;
  }

  private matchStatus(normalizedQuery: string): PropertyStatus | undefined {
    if (/\b(khong hoat dong|ngung hoat dong)\b/.test(normalizedQuery)) {
      return "INACTIVE";
    }

    if (/\b(can xem xet|cho xem xet|review)\b/.test(normalizedQuery)) {
      return "REVIEW";
    }

    if (/\b(luu tru|archived)\b/.test(normalizedQuery)) {
      return "ARCHIVED";
    }

    if (/\b(dang hoat dong|hoat dong|active)\b/.test(normalizedQuery)) {
      return "ACTIVE";
    }

    return undefined;
  }

  private matchPropertyType(normalizedQuery: string) {
    return /\b(building|toa nha|can nha|nha)\b/.test(normalizedQuery)
      ? DEFAULT_PROPERTY_TYPE
      : undefined;
  }

  private searchStatus(status: string | undefined, intent: SearchIntent) {
    return VALID_STATUSES.has(status as PropertyStatus)
      ? (status as PropertyStatus)
      : intent.filters.status;
  }

  private searchPropertyType(propertyType: string | undefined, intent: SearchIntent) {
    return this.cleanString(propertyType) || intent.filters.propertyType;
  }

  private ambiguityWarning(query: string | undefined, intent: SearchIntent, tokens: string[]) {
    const normalizedQuery = normalizeSearchText(query || "");

    if (
      !this.isNaturalLanguageQuestion(normalizedQuery) ||
      intent.filters.ward ||
      intent.filters.district ||
      intent.filters.status ||
      intent.filters.propertyType ||
      tokens.length > 0
    ) {
      return undefined;
    }

    return "Bạn có thể chỉ rõ phường, quận hoặc điều kiện cần tìm?";
  }

  private isNaturalLanguageQuestion(normalizedQuery: string) {
    return /\b(cho toi|tim|danh sach|co bao nhieu|bao nhieu|vung nao|noi nao|hay cho biet)\b/.test(
      normalizedQuery
    );
  }

  private async densityRegions(
    intent: SearchIntent,
    tokens: string[],
    limit: number,
    source: string,
    locationFilters = this.densityLocationFilters(intent),
    terms =
      locationFilters.ward || locationFilters.district
        ? []
        : this.densitySearchTerms(intent, tokens)
  ): Promise<PropertyDensityRegion[]> {
    if (!this.sqlite) {
      return [];
    }

    const exactFilters = [
      locationFilters.ward ? `AND "ward" = ?` : "",
      locationFilters.district ? `AND "district" = ?` : ""
    ].join(" ");
    const termFilters = terms.map(() => `AND "searchTextNormalized" LIKE ?`).join(" ");
    const sql = `
      WITH filtered AS (
        SELECT
          "centroidLat",
          "centroidLng",
          "ward",
          "district"
        FROM "BuildingProperty"
        WHERE "deletedAt" IS NULL
          AND "source" = ?
          AND "centroidLat" IS NOT NULL
          AND "centroidLng" IS NOT NULL
          ${exactFilters}
          ${termFilters}
      ),
      cells AS (
        SELECT
          CAST("centroidLat" / ? AS INTEGER) AS lat_cell,
          CAST("centroidLng" / ? AS INTEGER) AS lng_cell,
          COUNT(*) AS count,
          AVG("centroidLat") AS center_lat,
          AVG("centroidLng") AS center_lng,
          MIN("centroidLat") AS min_lat,
          MIN("centroidLng") AS min_lng,
          MAX("centroidLat") AS max_lat,
          MAX("centroidLng") AS max_lng,
          MIN("ward") AS ward,
          MIN("district") AS district
        FROM filtered
        GROUP BY lat_cell, lng_cell
      )
      SELECT
        (lat_cell || ':' || lng_cell) AS cellId,
        count,
        center_lat AS centerLat,
        center_lng AS centerLng,
        min_lat AS minLat,
        min_lng AS minLng,
        max_lat AS maxLat,
        max_lng AS maxLng,
        (lat_cell * ?) AS cellSouth,
        (lng_cell * ?) AS cellWest,
        ((lat_cell + 1) * ?) AS cellNorth,
        ((lng_cell + 1) * ?) AS cellEast,
        ward,
        district
      FROM cells
      ORDER BY count ${intent.direction === "lowest" ? "ASC" : "DESC"}, center_lat ASC, center_lng ASC
      LIMIT ?
    `;
    const params = [
      source,
      ...[locationFilters.ward, locationFilters.district].filter(
        (value): value is string => Boolean(value)
      ),
      ...terms.map((term) => `%${term}%`),
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      limit
    ];
    const rows = this.sqlite.all<DensityRegionRow>(sql, ...params);

    const regions = rows.map((row, index) => this.densityRegion(row, index));
    await this.attachDensityObjects(regions, terms, source, locationFilters);

    return regions;
  }

  private densityLocationFilters(intent: SearchIntent) {
    const cache = this.locationNames();
    const ward = intent.filters.ward
      ? cache.wards.get(normalizeSearchText(intent.filters.ward))
      : undefined;
    const district = intent.filters.district
      ? cache.districts.get(normalizeSearchText(intent.filters.district))
      : undefined;

    return { ward, district };
  }

  private locationNames() {
    if (this.locationNameCache || !this.sqlite) {
      return this.locationNameCache || { wards: new Map(), districts: new Map() };
    }

    const rows = this.sqlite.all<{ ward?: string | null; district?: string | null }>(
      `
        SELECT "ward", "district"
        FROM "BuildingProperty"
        WHERE "deletedAt" IS NULL
          AND ("ward" IS NOT NULL OR "district" IS NOT NULL)
        GROUP BY "ward", "district"
      `
    );
    const wards = new Map<string, string>();
    const districts = new Map<string, string>();

    for (const row of rows) {
      const ward = this.cleanString(row.ward);
      const district = this.cleanString(row.district);
      if (ward) wards.set(normalizeSearchText(ward), ward);
      if (district) districts.set(normalizeSearchText(district), district);
    }

    this.locationNameCache = { wards, districts };
    return this.locationNameCache;
  }

  private densitySearchTerms(intent: SearchIntent, tokens: string[]) {
    const terms = [intent.filters.ward, intent.filters.district, ...tokens].filter(
      (term): term is string => Boolean(term && term.length >= 3)
    );

    return [...new Set(terms.map((term) => normalizeSearchText(term)))];
  }

  private densityTotal(
    intent: SearchIntent,
    tokens: string[],
    source: string,
    locationFilters = this.densityLocationFilters(intent),
    terms =
      locationFilters.ward || locationFilters.district
        ? []
        : this.densitySearchTerms(intent, tokens)
  ) {
    if (!this.sqlite) {
      return 0;
    }

    const exactFilters = [
      locationFilters.ward ? `AND "ward" = ?` : "",
      locationFilters.district ? `AND "district" = ?` : ""
    ].join(" ");
    const termFilters = terms.map(() => `AND "searchTextNormalized" LIKE ?`).join(" ");
    const rows = this.sqlite.all<{ count?: number }>(
      `
        SELECT COUNT(*) AS count
        FROM "BuildingProperty"
        WHERE "deletedAt" IS NULL
          AND "source" = ?
          ${exactFilters}
          ${termFilters}
      `,
      source,
      ...[locationFilters.ward, locationFilters.district].filter(
        (value): value is string => Boolean(value)
      ),
      ...terms.map((term) => `%${term}%`)
    );

    return Number(rows[0]?.count || 0);
  }

  private densityRegion(row: DensityRegionRow, index: number): PropertyDensityRegion {
    const centerLat = this.roundCoordinate(Number(row.centerLat));
    const centerLng = this.roundCoordinate(Number(row.centerLng));
    const south = this.roundCoordinate(Number(row.cellSouth ?? row.minLat));
    const west = this.roundCoordinate(Number(row.cellWest ?? row.minLng));
    const north = this.roundCoordinate(Number(row.cellNorth ?? row.maxLat));
    const east = this.roundCoordinate(Number(row.cellEast ?? row.maxLng));
    const ward = this.cleanString(row.ward);
    const district = this.cleanString(row.district);

    return {
      id: String(row.cellId || `density-${index + 1}`),
      label: [ward, district].filter(Boolean).join(", ") || `Vung ${index + 1}`,
      count: Number(row.count || 0),
      center: { lat: centerLat, lng: centerLng },
      bbox: { south, west, north, east },
      ward,
      district,
      objects: []
    };
  }

  private async attachDensityObjects(
    regions: PropertyDensityRegion[],
    terms: string[],
    source: string,
    locationFilters: { ward?: string; district?: string } = {}
  ) {
    if (regions.length === 0) {
      return;
    }

    await Promise.all(
      this.densityObjectAllocations(regions).map(async ({ region, take }) => {
        const andFilters: Record<string, unknown>[] = [
          { centroidLat: { gte: region.bbox.south, lte: region.bbox.north } },
          { centroidLng: { gte: region.bbox.west, lte: region.bbox.east } }
        ];

        for (const term of terms) {
          this.addNormalizedPhraseFilter(andFilters, term);
        }

        if (locationFilters.ward) {
          andFilters.push({ ward: locationFilters.ward });
        }

        if (locationFilters.district) {
          andFilters.push({ district: locationFilters.district });
        }

        const rows = (await this.prisma.buildingProperty.findMany({
          where: {
            deletedAt: null,
            source,
            AND: andFilters
          },
          select: this.selectLightPropertyFields(),
          orderBy: [{ updatedAt: "desc" }],
          take
        })) as BuildingPropertyRow[];

        region.objects = rows
          .map((row) => this.densityObject(row))
          .filter((object): object is PropertyDensityObject => Boolean(object));
      })
    );
  }

  private densityObjectAllocations(regions: PropertyDensityRegion[]) {
    const total = regions.reduce((sum, region) => sum + Math.max(0, region.count), 0);
    if (total <= 0) {
      return [];
    }

    const allocations = regions.map((region) => ({
      region,
      take:
        region.count > 0
          ? Math.max(1, Math.floor((DEFAULT_DENSITY_OBJECT_LIMIT * region.count) / total))
          : 0
    }));
    const allocated = allocations.reduce((sum, allocation) => sum + allocation.take, 0);
    if (allocations[0]) {
      allocations[0].take += DEFAULT_DENSITY_OBJECT_LIMIT - allocated;
    }

    return allocations.filter((allocation) => allocation.take > 0);
  }

  private selectLightPropertyFields() {
    return {
      id: true,
      code: true,
      overtureId: true,
      name: true,
      addressLine: true,
      street: true,
      ward: true,
      district: true,
      city: true,
      propertyType: true,
      status: true,
      source: true,
      sourceVersion: true,
      level: true,
      height: true,
      floors: true,
      areaSqm: true,
      centroidLat: true,
      centroidLng: true,
      bbox: true,
      searchText: true,
      searchTextNormalized: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true
    };
  }

  private densityObject(row: BuildingPropertyRow): PropertyDensityObject | null {
    const bbox = this.propertyObjectBbox(row);
    const geometry = this.validGeoJsonGeometry(row.geometry);
    const center = this.propertyObjectCenter(row);

    if (!bbox && !geometry && !center) {
      return null;
    }

    return {
      id: row.id,
      type: "building",
      center,
      bbox,
      geometry,
      geometrySource: "overture_property_search",
      properties: {
        code: row.code,
        name: row.name,
        ward: row.ward,
        district: row.district,
        source: row.source
      }
    };
  }

  private propertyObjectCenter(row: BuildingPropertyRow) {
    const lat = Number(row.centroidLat);
    const lng = Number(row.centroidLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return undefined;
    }

    return {
      lat: this.roundCoordinate(lat),
      lng: this.roundCoordinate(lng)
    };
  }

  private validGeoJsonGeometry(geometry: unknown) {
    if (!geometry || typeof geometry !== "object" || Array.isArray(geometry)) {
      return undefined;
    }

    const candidate = geometry as { type?: unknown; coordinates?: unknown };
    if (typeof candidate.type !== "string" || !Array.isArray(candidate.coordinates)) {
      return undefined;
    }

    return geometry;
  }

  private propertyObjectBbox(row: BuildingPropertyRow): [number, number, number, number] | undefined {
    const bbox = row.bbox;

    if (Array.isArray(bbox) && bbox.length === 4) {
      const values = bbox.map((value) => Number(value));
      return values.every(Number.isFinite)
        ? (values as [number, number, number, number])
        : undefined;
    }

    if (bbox && typeof bbox === "object") {
      const objectBbox = bbox as { xmin?: unknown; ymin?: unknown; xmax?: unknown; ymax?: unknown };
      const values = [objectBbox.xmin, objectBbox.ymin, objectBbox.xmax, objectBbox.ymax].map((value) => Number(value));
      return values.every(Number.isFinite)
        ? (values as [number, number, number, number])
        : undefined;
    }

    if (row.centroidLat !== undefined && row.centroidLng !== undefined) {
      const lat = Number(row.centroidLat);
      const lng = Number(row.centroidLng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const delta = 0.00004;
        return [lng - delta, lat - delta, lng + delta, lat + delta];
      }
    }

    return undefined;
  }

  private searchAnswer(
    count: number,
    intent: SearchIntent,
    densityRegions: PropertyDensityRegion[] = []
  ): PropertySearchAnswer {
    const answerFilters = {
      ward: intent.filters.ward,
      district: intent.filters.district
    };
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
        filters: answerFilters,
        topRegion,
        text: topRegion
          ? intent.direction === "lowest"
            ? `Vung thua thot nhat co ${topRegion.count.toLocaleString("vi-VN")} toa nha tai ${topRegion.label}.`
            : `Vung day dac nhat co ${topRegion.count.toLocaleString("vi-VN")} toa nha tai ${topRegion.label}.`
          : `Khong tim thay vung mat do nha phu hop${filterText ? ` tai ${filterText}` : ""}.`
      };
    }

    return {
      type: "count",
      count,
      filters: answerFilters,
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
      .filter((token) => token.length > 1 && !STOP_WORDS_FOR_TOKENS.has(token));
  }

  private async withDensityTimeout<T>(operation: Promise<T>) {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error("Density query timed out")),
            DENSITY_BACKEND_TIMEOUT_MS
          );
        })
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private densityFallbackResponse(
    input: PropertySearchInput,
    limit: number,
    intent: SearchIntent,
    tokens: string[],
    total: number,
    warnings: string[],
    timedOut = false
  ) {
    return {
      items: [],
      answer: {
        type: "density",
        count: total,
        filters: {
          ward: intent.filters.ward,
          district: intent.filters.district
        },
        text: "Vui long thu hep khu vuc (phuong hoac quan) de cau hoi mat do chay nhanh hon."
      },
      map: {
        type: "property-density",
        regions: []
      },
      meta: {
        limit,
        tokens,
        normalizedQuery: normalizeSearchText(input.query || ""),
        searchMode: "postgres-normalized-vietnamese-nl-fuzzy-density",
        semanticModel: "paraphrase-multilingual-MiniLM-L12-v2-ready",
        warnings,
        densityDirection: intent.direction || "highest",
        timedOut,
        total,
        ambiguityWarning: this.ambiguityWarning(input.query, intent, tokens)
      }
    };
  }

  private listSearchFallbackResponse(
    input: PropertySearchInput,
    limit: number,
    intent: SearchIntent,
    tokens: string[],
    warnings: string[]
  ) {
    return {
      items: [],
      meta: {
        limit,
        tokens,
        normalizedQuery: normalizeSearchText(input.query || ""),
        searchMode: "postgres-normalized-lexical",
        semanticModel: "paraphrase-multilingual-MiniLM-L12-v2-ready",
        warnings,
        total: 0,
        ambiguityWarning: this.ambiguityWarning(input.query, intent, tokens)
      }
    };
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
