import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
// BetterSqliteService removed
import { PrismaService } from "../prisma/prisma.service";
import { DENSITY_OBJECT_LIMIT } from "./density-config";
import { ElasticsearchPropertySearchProvider } from "./elasticsearch-property-search.provider";
import { PropertySearchProvider } from "./property-search-provider";
import { normalizeSearchText, levenshteinDistance, validLimit, searchTokens, searchSource, withSemanticProviderTimeout, searchStatus, semanticSearchFallbackWarning, densitySearchTerms, withDensityTimeout, searchAnswer, withListSearchTimeout, selectLightPropertyFields, isExplicitListQuery, validDateRange, cleanString, isSameSearchTokenFilter, bestFuzzyTokenScore, minimumSearchScore, extractPhraseAfter, matchKnownWard, matchKnownDistrict, matchStatus, matchPropertyType, isDensityQuestion, isCountQuestion, densityDirection, isNaturalLanguageQuestion } from "./properties.utils";
import { Delegate, PropertiesPrisma, PropertyStatus, BuildingPropertyRow, PropertyDensityRegion, PropertySearchMap, PropertyDensityObject, PropertySearchAnswer, SearchIntent, DensityRegionRow, PropertySearchInput, PropertyHeatmapInput, PropertyMutationInput, AssetImportResult, ImportOptions, OvertureFeature, DEFAULT_CITY, DEFAULT_PROPERTY_TYPE, DEFAULT_STATUS, DEFAULT_SOURCE, OVERTURE_SOURCE, MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_DENSITY_GRID_SIZE, DEFAULT_DENSITY_REGION_LIMIT, DEFAULT_DENSITY_OBJECT_LIMIT, DENSITY_BACKEND_TIMEOUT_MS, SEMANTIC_PROVIDER_TIMEOUT_MS, LIST_SEARCH_TIMEOUT_MS, DEFAULT_EMBEDDING_MODEL, VALID_STATUSES, STOP_WORDS_FOR_TOKENS, LOWEST_DENSITY_PHRASES, HIGHEST_DENSITY_PHRASES, DENSITY_INTENT_KEYWORDS, INTENT_KEYWORDS, STATIC_LOCATIONS, DANANG_DISTRICTS, PropertiesServiceOptions, PROPERTIES_SERVICE_OPTIONS } from "./properties.types";
import { PropertiesSpatialService } from "./properties.spatial.service";
import { GroqService, ParsedSpatialQuery } from "../groq/groq.service";

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

function replacePlaceholders(sql: string): string {
  let count = 1;
  return sql.replace(/\?/g, () => `$${count++}`);
}

@Injectable()
export class PropertiesSearchService {
  private readonly configuredElasticsearchProvider?: PropertySearchProvider;
  private readonly propertySearchProvider?: "postgres" | "elasticsearch";
  private defaultElasticsearchProvider?: PropertySearchProvider;
  private locationNameCache?: {
    wards: Map<string, string>;
    districts: Map<string, string>;
  };

  constructor(
    @Inject(PrismaService) private readonly prisma: PropertiesPrisma,
    @Inject(PropertiesSpatialService) private readonly spatialService: PropertiesSpatialService,
    @Inject(GroqService) private readonly groqService: GroqService,
    @Optional() @Inject(PROPERTIES_SERVICE_OPTIONS) options: PropertiesServiceOptions = {},
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache
  ) {
    this.configuredElasticsearchProvider = options?.elasticsearchProvider;
    this.propertySearchProvider = options?.propertySearchProvider;
  }

  async searchProperties(input: PropertySearchInput = {}): Promise<any> {
    const limit = validLimit(input.limit);
    const cacheKey = `search:${JSON.stringify(input)}:${limit}`;
    
    if (this.cacheManager) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;
    }

    const result = await this.executeSearch(input, limit);
    if (this.cacheManager && result) {
      await this.cacheManager.set(cacheKey, result, 600000); // 10 mins cache for searches
    }
    return result;
  }

  private async executeSearch(input: PropertySearchInput, limit: number): Promise<any> {
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
    if (input.query) {
      const spatialKeywords = ["gần", "cạnh", "bán kính", "xung quanh", "cách", "giao với", "ngập", "lụt", "sạt", "lở", "rủi ro"];
      if (spatialKeywords.some(kw => input.query!.toLowerCase().includes(kw))) {
        const parsedSpatial = await this.groqService.parseSpatialQuery(input.query);
        if (parsedSpatial.riskType || (parsedSpatial.isRelational && parsedSpatial.referenceName)) {
          return this.searchRelationalSpatialPostgis(parsedSpatial, limit);
        }
      }
    }

    const intent = this.searchIntent(input.query);
    
    if (input.ward) intent.filters.ward = input.ward;
    if (input.district) intent.filters.district = input.district;
    if (input.status && VALID_STATUSES.has(input.status as PropertyStatus)) {
      intent.filters.status = input.status as PropertyStatus;
    }
    if (input.propertyType) intent.filters.propertyType = input.propertyType;

    const tokens = searchTokens(input.query);
    const source = searchSource(input.source);

    if (this.shouldUseElasticsearch(intent, input, tokens)) {
      try {
        const providerResult = await withSemanticProviderTimeout(
          (signal) =>
            this.elasticsearchProvider().search({
              query: input.query,
              status: searchStatus(input.status, intent),
              propertyType: this.searchPropertyType(input.propertyType, intent),
              source,
              limit,
              tokens,
              normalizedQuery: normalizeSearchText(input.query || ""),
              signal,
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
      } catch (error: any) {
        console.error("Elasticsearch error in searchProperties:", error?.message || error);
        const result = await this.searchPropertiesPostgres(input, limit, intent, tokens, source);
        const warning = semanticSearchFallbackWarning(error);
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

  private async searchRelationalSpatialPostgis(parsed: ParsedSpatialQuery, limit: number): Promise<any> {
    const { referenceName, targetCategory, distanceMeters = 500, district, ward, riskType } = parsed;
    
    // Risk Query without reference name (e.g. "nhà hàng dễ ngập lụt ở quận hải châu")
    if (riskType && !referenceName) {
      const isBuilding = targetCategory === "building";
      const tableName = isBuilding ? "BuildingProperty" : "Place";
      const catCol = isBuilding ? "propertyType" : "category";
      
      const targetRows = await this.prisma.$queryRawUnsafe<any[]>(
        replacePlaceholders(`
          SELECT id, name, ${catCol} as category, ${isBuilding ? "''" : "address"} as address, 
                 ${isBuilding ? '"centroidLng"' : "ST_X(location::geometry)"} as "centroidLng", 
                 ${isBuilding ? '"centroidLat"' : "ST_Y(location::geometry)"} as "centroidLat"
          FROM "${tableName}"
          WHERE ${targetCategory && !isBuilding ? `${catCol} ILIKE '%' || ? || '%'` : "1=1"}
            ${district ? "AND district ILIKE '%' || ? || '%'" : ""}
            ${ward ? "AND ward ILIKE '%' || ? || '%'" : ""}
            AND "riskFlags" @> ?
          LIMIT ?
        `),
        ...(targetCategory && !isBuilding ? [targetCategory] : []),
        ...(district ? [district] : []),
        ...(ward ? [ward] : []),
        `["${riskType}"]`,
        limit
      );

      const items = targetRows.map(row => ({
        id: row.id,
        name: row.name,
        propertyType: row.category,
        addressLine: row.address,
        centroidLat: row.centroidLat,
        centroidLng: row.centroidLng,
        distance: 0
      }));

      const locationText = [ward, district].filter(Boolean).join(", ");

      return {
        items,
        answer: {
          type: "spatial",
          text: `Tìm thấy ${items.length} ${targetCategory || "địa điểm"} có rủi ro ${riskType === "flood" ? "ngập lụt" : "sạt lở"} ở ${locationText}.`
        },
        meta: {
          limit,
          searchMode: "spatial-risk",
          parsedQuery: parsed
        }
      };
    }

    // Normal Relational Spatial Query
    // Find reference location in Place
    const refPlaceRows = await this.prisma.$queryRawUnsafe<any[]>(
      replacePlaceholders(`
        SELECT id, name, category, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat
        FROM "Place"
        WHERE name ILIKE '%' || ? || '%' ${district ? "AND district ILIKE '%' || ? || '%'" : ""}
        LIMIT 1
      `),
      referenceName,
      ...(district ? [district] : [])
    );

    let refLat: number, refLng: number;
    let refName = "";

    if (refPlaceRows.length > 0) {
      refLat = refPlaceRows[0].lat;
      refLng = refPlaceRows[0].lng;
      refName = refPlaceRows[0].name;
    } else {
      // Fallback to BuildingProperty
      const refBldgRows = await this.prisma.$queryRawUnsafe<any[]>(
        replacePlaceholders(`
          SELECT id, name, "centroidLat" as lat, "centroidLng" as lng
          FROM "BuildingProperty"
          WHERE "searchTextNormalized" LIKE '%' || ? || '%' ${district ? "AND district ILIKE '%' || ? || '%'" : ""}
          LIMIT 1
        `),
        normalizeSearchText(referenceName || ""),
        ...(district ? [district] : [])
      );
      if (refBldgRows.length > 0) {
        refLat = refBldgRows[0].lat;
        refLng = refBldgRows[0].lng;
        refName = refBldgRows[0].name || referenceName;
      } else {
        return {
          items: [],
          meta: { limit, searchMode: "spatial-relational", warnings: [`Không tìm thấy địa điểm mốc: ${referenceName}`] }
        };
      }
    }

    // Now find targets using ST_DWithin
    const targetRows = await this.prisma.$queryRawUnsafe<any[]>(
      replacePlaceholders(`
        SELECT id, name, category, address, ST_X(location::geometry) as "centroidLng", ST_Y(location::geometry) as "centroidLat",
          ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) as distance
        FROM "Place"
        WHERE category ILIKE '%' || ? || '%'
          AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
        ORDER BY distance ASC
        LIMIT ?
      `),
      refLng, refLat,
      targetCategory || "",
      refLng, refLat, distanceMeters,
      limit
    );

    const items = targetRows.map(row => ({
      id: row.id,
      name: row.name,
      propertyType: row.category,
      addressLine: row.address,
      centroidLat: row.centroidLat,
      centroidLng: row.centroidLng,
      distance: Math.round(row.distance)
    }));

    return {
      items,
      answer: {
        type: "spatial",
        text: `Tìm thấy ${items.length} ${targetCategory} trong bán kính ${distanceMeters}m quanh ${refName}.`
      },
      map: {
        type: "focus",
        center: { lat: refLat, lng: refLng }
      },
      meta: {
        limit,
        searchMode: "spatial-relational",
        parsedQuery: parsed
      }
    };
  }

  private async searchPropertiesPostgres(
    input: PropertySearchInput,
    limit: number,
    intent: SearchIntent,
    tokens: string[],
    source?: string
  ) {
    if (intent.type === "density") {
      const locationFilters = this.spatialService.densityLocationFilters(intent);
      const terms = densitySearchTerms(intent, tokens);

      if (!locationFilters.ward && !locationFilters.district) {
        return this.spatialService.densityFallbackResponse(input, limit, intent, tokens, 0, [
          "Density query requires a ward or district; none detected.",
          "Tìm kiếm mật độ yêu cầu chỉ rõ tên Phường hoặc Quận/Huyện cụ thể (ví dụ: phường Hòa Khánh Bắc)."
        ]);
      }

      let densityRegions: PropertyDensityRegion[] = [];
      let total = 0;
      let warnings: string[] = [];
      let timedOut = false;

      try {
        [densityRegions, total] = await withDensityTimeout(
          Promise.all([
            this.spatialService.densityRegions(
              intent,
              tokens,
              DEFAULT_DENSITY_REGION_LIMIT,
              source,
              locationFilters,
              terms
            ),
            Promise.resolve(this.spatialService.densityTotal(intent, tokens, source, locationFilters, terms))
          ])
        );
      } catch {
        warnings = ["Density query timed out; please specify ward or district."];
        timedOut = true;
      }

      if (timedOut) {
        return this.spatialService.densityFallbackResponse(input, limit, intent, tokens, 0, warnings, true);
      }

      return {
        items: [],
        answer: searchAnswer(total, intent, densityRegions),
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
        return await withListSearchTimeout(
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
    const answer = searchAnswer(total, intent);

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
    source?: string
  ) {
    const sqliteResult = await this.searchPropertiesSqliteList(input, limit, intent, tokens, source);
    if (sqliteResult && sqliteResult.items.length > 0) {
      return sqliteResult;
    }

    const where = this.searchWhere(input, tokens, intent, source);
    require('fs').writeFileSync('where.json', JSON.stringify(where, null, 2));
    const startPg = Date.now();
    let rows = (await this.prisma.buildingProperty.findMany({
      where,
      select: selectLightPropertyFields(),
      orderBy: [{ updatedAt: "desc" }],
      take: Math.min(MAX_LIMIT, limit + 15)
    })) as BuildingPropertyRow[];
    console.log("Postgres findMany time:", Date.now() - startPg, "ms");
    let rankedRows = this.rankRows(rows, tokens).slice(0, limit);

    if (rankedRows.length === 0 && tokens.length > 0) {
      rows = (await this.prisma.buildingProperty.findMany({
        where: this.fuzzySearchWhere(input, tokens, source, intent),
        select: selectLightPropertyFields(),
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

  private async searchPropertiesSqliteList(
    input: PropertySearchInput,
    limit: number,
    intent: SearchIntent,
    tokens: string[],
    source?: string
  ) {
    if (
      !isExplicitListQuery(input.query) ||
      !this.shouldUseExactLocationColumns(intent)
    ) {
      return undefined;
    }

    const statusFilter = intent.filters.status ? `AND "status" = ?` : "";
    const propertyTypeFilter = intent.filters.propertyType ? `AND "propertyType" = ?` : "";

    const exactFilters = [
      intent.filters.ward ? `AND "ward" = ?` : "",
      intent.filters.district ? `AND "district" = ?` : "",
      statusFilter,
      propertyTypeFilter
    ].join(" ");
    const sourceFilter = source ? `AND "source" = ?` : "";
    const params = [];
    if (source) params.push(source);
    params.push(
      ...[intent.filters.ward, intent.filters.district, intent.filters.status, intent.filters.propertyType].filter((value): value is string => Boolean(value)),
      Math.min(MAX_LIMIT, limit + 15)
    );

    const sql = `
        SELECT
          "id", "code", "overtureId", "name", "addressLine", "street", "ward", "district", "city", "propertyType", "status", "source", "sourceVersion", "level", "height", "floors", "areaSqm", "centroidLat", "centroidLng", "bbox", "searchText", "searchTextNormalized", "createdAt", "updatedAt", "deletedAt"
        FROM "BuildingProperty"
        WHERE "deletedAt" IS NULL
          ${sourceFilter}
          ${exactFilters}
        ORDER BY "name" ASC
        LIMIT ?
      `;
    
    const rows = await this.prisma.$queryRawUnsafe<BuildingPropertyRow[]>(
      replacePlaceholders(sql),
      ...params
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
      !isExplicitListQuery(input.query) &&
      tokens.length > 0 &&
      !validDateRange(input.updatedFrom, input.updatedTo)
    );
  }

  private elasticsearchProvider() {
    if (this.configuredElasticsearchProvider) {
      return this.configuredElasticsearchProvider;
    }

    if (!this.defaultElasticsearchProvider) {
      this.defaultElasticsearchProvider = new ElasticsearchPropertySearchProvider(this.prisma);
    }

    return this.defaultElasticsearchProvider;
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

  private searchWhere(
    input: PropertySearchInput,
    tokens: string[],
    intent: SearchIntent,
    source?: string
  ) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (source) where.source = source;
    const andFilters: Record<string, unknown>[] = [];

    const exactUsed = this.shouldUseExactLocationColumns(intent);
    if (exactUsed) {
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
        cleanString(input.ward) ||
        cleanString(input.district)
    );
    const shouldSkipTokenFilters =
      isExplicitListQuery(input.query) && hasLocationFilter && tokens.length <= 2;
    if (!shouldSkipTokenFilters) {
      this.addNormalizedTokenFilters(andFilters, tokens);
    }
    this.addNormalizedPhraseFilter(andFilters, input.street);
    if (!exactUsed) {
      this.addNormalizedPhraseFilter(andFilters, input.ward);
      this.addNormalizedPhraseFilter(andFilters, input.district);
    }

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

    const dateRange = validDateRange(input.updatedFrom, input.updatedTo);
    if (dateRange) {
      where.updatedAt = dateRange;
    }

    return where;
  }

  private fuzzySearchWhere(
    input: PropertySearchInput,
    tokens: string[],
    source?: string,
    intent?: SearchIntent
  ) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (source) where.source = source;
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

    const dateRange = validDateRange(input.updatedFrom, input.updatedTo);
    if (dateRange) {
      where.updatedAt = dateRange;
    }

    return where;
  }

  private addNormalizedPhraseFilter(andFilters: Record<string, unknown>[], value?: string) {
    const normalized = normalizeSearchText(value || "");

    if (!normalized) {
      return;
    }

    if (!andFilters.some((filter) => isSameSearchTokenFilter(filter, normalized))) {
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

          return score + bestFuzzyTokenScore(text, token);
        }, 0)
      }))
      .filter((item) => item.score >= minimumSearchScore(tokens))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.row);
  }

  private searchIntent(query?: string): SearchIntent {
    const normalizedQuery = normalizeSearchText(query || "");
    const locationAfterAt = extractPhraseAfter(normalizedQuery, "o", [
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
    const locationNames = this.spatialService.locationNames();
    const knownWard = matchKnownWard(normalizedQuery, locationNames.wards);
    const knownDistrict = matchKnownDistrict(normalizedQuery, locationNames.districts);
    const district =
      knownDistrict ||
      extractPhraseAfter(normalizedQuery, "quan", ["la", "co", "bao", "so"]) ||
      extractPhraseAfter(normalizedQuery, "huyen", ["la", "co", "bao", "so"]) ||
      extractPhraseAfter(normalizedQuery, "thuoc", ["la", "co", "bao", "so"]);
    const wardFromMarker = extractPhraseAfter(normalizedQuery, "phuong", [
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
      status: matchStatus(normalizedQuery),
      propertyType: matchPropertyType(normalizedQuery)
    };

    return {
      type: isDensityQuestion(normalizedQuery)
        ? "density"
        : isCountQuestion(normalizedQuery)
          ? "count"
          : "list",
      direction: densityDirection(normalizedQuery),
      filters
    };
  }

  private shouldUseExactLocationColumns(intent: SearchIntent) {
    if (!intent.filters.ward && !intent.filters.district) {
      return false;
    }

    const cache = this.spatialService.locationNames();
    return Boolean(
      (intent.filters.ward && cache.wards.has(normalizeSearchText(intent.filters.ward))) ||
        (intent.filters.district && cache.districts.has(normalizeSearchText(intent.filters.district)))
    );
  }

  private searchPropertyType(propertyType: string | undefined, intent: SearchIntent) {
    return cleanString(propertyType) || intent.filters.propertyType;
  }

  private ambiguityWarning(query: string | undefined, intent: SearchIntent, tokens: string[]) {
    const normalizedQuery = normalizeSearchText(query || "");

    if (
      !isNaturalLanguageQuestion(normalizedQuery) ||
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
}

