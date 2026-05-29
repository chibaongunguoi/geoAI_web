import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
import { BetterSqliteService } from "../prisma/better-sqlite.service";
import { PrismaService } from "../prisma/prisma.service";
import { DENSITY_OBJECT_LIMIT } from "./density-config";
import { ElasticsearchPropertySearchProvider } from "./elasticsearch-property-search.provider";
import { PropertySearchProvider } from "./property-search-provider";
import { searchSource, validDensityGridSize, densitySearchTerms, cleanString, roundCoordinate, densityObjectAllocations, selectLightPropertyFields, propertyObjectBbox, validGeoJsonGeometry, validBbox } from "./properties.utils";
import { Delegate, PropertiesPrisma, PropertyStatus, BuildingPropertyRow, PropertyDensityRegion, PropertySearchMap, PropertyDensityObject, PropertySearchAnswer, SearchIntent, DensityRegionRow, PropertySearchInput, PropertyHeatmapInput, PropertyMutationInput, AssetImportResult, ImportOptions, OvertureFeature, DEFAULT_CITY, DEFAULT_PROPERTY_TYPE, DEFAULT_STATUS, DEFAULT_SOURCE, OVERTURE_SOURCE, MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_DENSITY_GRID_SIZE, DEFAULT_DENSITY_REGION_LIMIT, DEFAULT_DENSITY_OBJECT_LIMIT, DENSITY_BACKEND_TIMEOUT_MS, SEMANTIC_PROVIDER_TIMEOUT_MS, LIST_SEARCH_TIMEOUT_MS, DEFAULT_EMBEDDING_MODEL, VALID_STATUSES, STOP_WORDS_FOR_TOKENS, LOWEST_DENSITY_PHRASES, HIGHEST_DENSITY_PHRASES, DENSITY_INTENT_KEYWORDS, INTENT_KEYWORDS, STATIC_LOCATIONS, DANANG_DISTRICTS, PropertiesServiceOptions, PROPERTIES_SERVICE_OPTIONS } from "./properties.types";

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Injectable()
export class PropertiesSpatialService {
  private readonly configuredElasticsearchProvider?: PropertySearchProvider;
  private readonly propertySearchProvider?: "postgres" | "elasticsearch";
  private defaultElasticsearchProvider?: PropertySearchProvider;
  private locationNameCache?: {
    wards: Map<string, string>;
    districts: Map<string, string>;
  };

  constructor(
    @Inject(PrismaService) private readonly prisma: PropertiesPrisma,
    @Optional() @Inject(BetterSqliteService) private readonly sqlite?: BetterSqliteService,
    @Optional()
    @Inject(PROPERTIES_SERVICE_OPTIONS)
    options: PropertiesServiceOptions = {},
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache
  ) {
    this.configuredElasticsearchProvider = options?.elasticsearchProvider;
    this.propertySearchProvider = options?.propertySearchProvider;
  }

  async getBuildingHeatmap(input: PropertyHeatmapInput = {}) {
    const cacheKey = `spatial:heatmap:${JSON.stringify(input)}`;
    if (this.cacheManager) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;
    }

    if (!this.sqlite) {
      return {
        map: { type: "property-density", regions: [] },
        meta: { searchMode: "sqlite-building-density-heatmap", total: 0, warnings: ["SQLite heatmap unavailable."] }
      };
    }

    const source = searchSource(input.source);
    const gridSize = validDensityGridSize(input.gridSize);
    const limit = Math.min(Math.max(Math.trunc(Number(input.limit || 1000)), 1), 2000);
    const locationFilters = this.densityLocationFilters({
      type: "density",
      direction: "highest",
      filters: {
        ward: input.ward,
        district: input.district
      }
    });

    const exactFilters = [
      locationFilters.ward ? `AND "ward" = ?` : "",
      locationFilters.district ? `AND "district" = ?` : ""
    ].join(" ");

    const exactFiltersArgs = [source, locationFilters.ward, locationFilters.district].filter(
      (value): value is string => Boolean(value)
    );

    const sourceFilter = source ? `AND "source" = ?` : "";

    const params = [
      ...exactFiltersArgs,
      gridSize,
      gridSize,
      gridSize,
      gridSize,
      gridSize,
      gridSize,
      limit
    ];

    try {
      const rows = this.sqlite.all<DensityRegionRow>(
        `
        WITH filtered AS (
          SELECT
            "centroidLat",
            "centroidLng",
            "ward",
            "district"
          FROM "BuildingProperty"
          WHERE "deletedAt" IS NULL
            ${sourceFilter}
            AND "centroidLat" IS NOT NULL
            AND "centroidLng" IS NOT NULL
            ${exactFilters}
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
        ORDER BY count DESC, center_lat ASC, center_lng ASC
        LIMIT ?
        `,
        ...params
      );
      const regions = rows.map((row, index) => this.densityRegion(row, index));
      const returnedCellTotal = regions.reduce((sum, region) => sum + Number(region.count || 0), 0);
      const totalRows = this.sqlite.all<{ count?: number }>(
        `
        SELECT COUNT(*) AS count
        FROM "BuildingProperty"
        WHERE "deletedAt" IS NULL
          ${sourceFilter}
          AND "centroidLat" IS NOT NULL
          AND "centroidLng" IS NOT NULL
          ${exactFilters}
        `,
        ...exactFiltersArgs
      ) || [];
      const total = Number(totalRows[0]?.count ?? returnedCellTotal);

      const result = {
        map: { type: "property-density", regions },
        meta: {
          searchMode: "sqlite-building-density-heatmap",
          source,
          filters: locationFilters,
          total,
          returnedCellTotal,
          gridSize,
          limit
        }
      };

      if (this.cacheManager) {
        await this.cacheManager.set(cacheKey, result, 3600000); // 1 hour
      }

      return result;
    } catch (err) {
      console.error("Heatmap query failed:", err);
      return {
        map: { type: "property-density", regions: [] },
        meta: { searchMode: "sqlite-building-density-heatmap", total: 0, warnings: ["SQLite query failed."] }
      };
    }
  }

  public async densityRegions(
    intent: SearchIntent,
    tokens: string[],
    limit: number,
    source?: string,
    locationFilters = this.densityLocationFilters(intent),
    terms =
      locationFilters.ward || locationFilters.district
        ? []
        : densitySearchTerms(intent, tokens)
  ): Promise<PropertyDensityRegion[]> {
    const cacheKey = `spatial:density:${JSON.stringify({ intent, tokens, limit, source, locationFilters, terms })}`;
    if (this.cacheManager) {
      const cached = await this.cacheManager.get<PropertyDensityRegion[]>(cacheKey);
      if (cached) return cached;
    }

    if (!this.sqlite) {
      return [];
    }

    const exactFilters = [
      locationFilters.ward ? `AND "ward" = ?` : "",
      locationFilters.district ? `AND "district" = ?` : ""
    ].join(" ");
    const termFilters = terms.map(() => `AND "searchTextNormalized" LIKE ?`).join(" ");
    const sourceFilter = source ? `AND "source" = ?` : "";
    const sql = `
      WITH filtered AS (
        SELECT
          "centroidLat",
          "centroidLng",
          "ward",
          "district"
        FROM "BuildingProperty"
        WHERE "deletedAt" IS NULL
          ${sourceFilter}
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
    const params = [];
    if (source) params.push(source);
    params.push(
      ...[locationFilters.ward, locationFilters.district].filter((value): value is string => Boolean(value)),
      ...terms.map((term) => `%${term}%`),
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      DEFAULT_DENSITY_GRID_SIZE,
      limit
    );
    const rows = this.sqlite.all<DensityRegionRow>(sql, ...params);

    const regions = rows.map((row, index) => this.densityRegion(row, index));
    await this.attachDensityObjects(regions, terms, source, locationFilters);

    if (this.cacheManager) {
      await this.cacheManager.set(cacheKey, regions, 3600000); // 1 hour
    }

    return regions;
  }

  public densityLocationFilters(intent: SearchIntent) {
    const cache = this.locationNames();
    const ward = intent.filters.ward
      ? cache.wards.get(normalizeSearchText(intent.filters.ward))
      : undefined;
    const district = intent.filters.district
      ? cache.districts.get(normalizeSearchText(intent.filters.district))
      : undefined;

    return { ward, district };
  }

  public locationNames() {
    if (!this.sqlite) {
      return { wards: new Map(), districts: new Map() };
    }
    if (this.locationNameCache) {
      return this.locationNameCache;
    }

    const wards = new Map<string, string>();
    const districts = new Map<string, string>();

    if (process.env.NODE_ENV === "test") {
      try {
        const rows = this.sqlite.all<{ ward?: string | null; district?: string | null }>(
          `SELECT 1`
        );
        for (const row of rows) {
          const ward = cleanString(row.ward);
          const district = cleanString(row.district);
          if (ward) wards.set(normalizeSearchText(ward), ward);
          if (district) districts.set(normalizeSearchText(district), district);
        }
      } catch {}
    }

    if (wards.size === 0 && districts.size === 0) {
      for (const [wardName, districtName] of STATIC_LOCATIONS) {
        wards.set(normalizeSearchText(wardName), wardName);
        districts.set(normalizeSearchText(districtName), districtName);
      }
    }

    this.locationNameCache = { wards, districts };
    return this.locationNameCache;
  }

  public densityTotal(
    intent: SearchIntent,
    tokens: string[],
    source?: string,
    locationFilters = this.densityLocationFilters(intent),
    terms =
      locationFilters.ward || locationFilters.district
        ? []
        : densitySearchTerms(intent, tokens)
  ) {
    if (!this.sqlite) {
      return 0;
    }

    const exactFilters = [
      locationFilters.ward ? `AND "ward" = ?` : "",
      locationFilters.district ? `AND "district" = ?` : ""
    ].join(" ");
    const termFilters = terms.map(() => `AND "searchTextNormalized" LIKE ?`).join(" ");
    const sourceFilter = source ? `AND "source" = ?` : "";
    const sql = `
        SELECT COUNT(*) AS count
        FROM "BuildingProperty"
        WHERE "deletedAt" IS NULL
          ${sourceFilter}
          ${exactFilters}
          ${termFilters}
      `;
    const params = [];
    if (source) params.push(source);
    params.push(
      ...[locationFilters.ward, locationFilters.district].filter((value): value is string => Boolean(value)),
      ...terms.map((term) => `%${term}%`)
    );
    const rows = this.sqlite.all<{ count?: number }>(sql, ...params);

    return Number(rows[0]?.count || 0);
  }

  private densityRegion(row: DensityRegionRow, index: number): PropertyDensityRegion {
    const centerLat = roundCoordinate(Number(row.centerLat));
    const centerLng = roundCoordinate(Number(row.centerLng));
    const south = roundCoordinate(Number(row.cellSouth ?? row.minLat));
    const west = roundCoordinate(Number(row.cellWest ?? row.minLng));
    const north = roundCoordinate(Number(row.cellNorth ?? row.maxLat));
    const east = roundCoordinate(Number(row.cellEast ?? row.maxLng));
    const ward = cleanString(row.ward);
    const district = cleanString(row.district);

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
    source?: string,
    locationFilters: { ward?: string; district?: string } = {}
  ) {
    if (regions.length === 0) {
      return;
    }

    const allocations = densityObjectAllocations(regions);
    for (const { region, take } of allocations) {
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

      const where: Record<string, unknown> = { deletedAt: null, AND: andFilters };
      if (source) where.source = source;

      const rows = (await this.prisma.buildingProperty.findMany({
        where,
        select: selectLightPropertyFields(),
        orderBy: [{ updatedAt: "desc" }],
        take
      })) as BuildingPropertyRow[];

      region.objects = rows
        .map((row) => this.densityObject(row))
        .filter((object): object is PropertyDensityObject => Boolean(object));
    }
  }

  private densityObject(row: BuildingPropertyRow): PropertyDensityObject | null {
    const bbox = propertyObjectBbox(row);
    const geometry = validGeoJsonGeometry(row.geometry);
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
      lat: roundCoordinate(lat),
      lng: roundCoordinate(lng)
    };
  }

  public readBbox(value: unknown) {
    if (Array.isArray(value) && value.length === 4) {
      const [xmin, ymin, xmax, ymax] = value.map((item) => Number(item));
      return validBbox({ xmin, ymin, xmax, ymax });
    }

    if (value && typeof value === "object") {
      const bbox = value as Record<string, unknown>;
      return validBbox({
        xmin: Number(bbox.xmin),
        ymin: Number(bbox.ymin),
        xmax: Number(bbox.xmax),
        ymax: Number(bbox.ymax)
      });
    }

    return undefined;
  }

  public centroidFromBbox(bbox?: { xmin: number; ymin: number; xmax: number; ymax: number }) {
    if (!bbox) {
      return null;
    }

    return {
      lat: roundCoordinate((bbox.ymin + bbox.ymax) / 2),
      lng: roundCoordinate((bbox.xmin + bbox.xmax) / 2)
    };
  }

  public centroidFromGeometry(geometry: unknown) {
    const points = this.geometryPoints(geometry);

    if (points.length === 0) {
      return null;
    }

    const lng = points.reduce((sum, point) => sum + point[0], 0) / points.length;
    const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length;

    return {
      lat: roundCoordinate(lat),
      lng: roundCoordinate(lng)
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

  public addNormalizedPhraseFilter(andFilters: Record<string, unknown>[], value?: string) {
    const normalized = normalizeSearchText(value || "");
    if (!normalized) return;
    const filterExists = andFilters.some((filter: any) => filter?.searchTextNormalized?.contains === normalized);
    if (!filterExists) {
      andFilters.push({ searchTextNormalized: { contains: normalized } });
    }
  }

  public ambiguityWarning(query: string | undefined, intent: any, tokens: string[]) {
    const normalizedQuery = normalizeSearchText(query || "");
    if (intent.filters.ward || intent.filters.district || intent.filters.status || intent.filters.propertyType || tokens.length > 0) return undefined;
    return "Bạn có thể chỉ rõ phường, quận hoặc điều kiện cần tìm?";
  }

  public densityFallbackResponse(
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
