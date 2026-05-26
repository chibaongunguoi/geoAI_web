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
import { formatCode, withoutCode, cleanString, featureProperties, numberValue, integerValue } from "./properties.utils";
import { Delegate, PropertiesPrisma, PropertyStatus, BuildingPropertyRow, PropertyDensityRegion, PropertySearchMap, PropertyDensityObject, PropertySearchAnswer, SearchIntent, DensityRegionRow, PropertySearchInput, PropertyHeatmapInput, PropertyMutationInput, AssetImportResult, ImportOptions, OvertureFeature, DEFAULT_CITY, DEFAULT_PROPERTY_TYPE, DEFAULT_STATUS, DEFAULT_SOURCE, OVERTURE_SOURCE, MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_DENSITY_GRID_SIZE, DEFAULT_DENSITY_REGION_LIMIT, DEFAULT_DENSITY_OBJECT_LIMIT, DENSITY_BACKEND_TIMEOUT_MS, SEMANTIC_PROVIDER_TIMEOUT_MS, LIST_SEARCH_TIMEOUT_MS, DEFAULT_EMBEDDING_MODEL, VALID_STATUSES, STOP_WORDS_FOR_TOKENS, LOWEST_DENSITY_PHRASES, HIGHEST_DENSITY_PHRASES, DENSITY_INTENT_KEYWORDS, INTENT_KEYWORDS, STATIC_LOCATIONS, DANANG_DISTRICTS, PropertiesServiceOptions, PROPERTIES_SERVICE_OPTIONS } from "./properties.types";
import { PropertiesCrudService } from "./properties.crud.service";
import { PropertiesSpatialService } from "./properties.spatial.service";

@Injectable()
export class PropertiesImportService {
  private readonly configuredElasticsearchProvider?: PropertySearchProvider;
  private readonly propertySearchProvider?: "postgres" | "elasticsearch";
  private defaultElasticsearchProvider?: PropertySearchProvider;
  private locationNameCache?: {
    wards: Map<string, string>;
    districts: Map<string, string>;
  };

  constructor(
    @Inject(PrismaService) private readonly prisma: PropertiesPrisma,
    @Inject(PropertiesCrudService) private readonly crudService: PropertiesCrudService,
    @Inject(PropertiesSpatialService) private readonly spatialService: PropertiesSpatialService,
    @Optional() @Inject(BetterSqliteService) private readonly sqlite?: BetterSqliteService,
    @Optional() @Inject(PROPERTIES_SERVICE_OPTIONS) options: PropertiesServiceOptions = {}
  ) {
    this.configuredElasticsearchProvider = options?.elasticsearchProvider;
    this.propertySearchProvider = options?.propertySearchProvider;
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

      const data = this.crudService.propertyData(candidate.input, {
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
    const baseCount = await this.prisma.buildingProperty.count();

    for (const feature of features) {
      const data = this.overtureFeatureData(
        feature as OvertureFeature,
        formatCode(baseCount + imported + 1),
        options
      );

      if (!data) {
        skipped += 1;
        continue;
      }

      await this.prisma.buildingProperty.upsert({
        where: { overtureId: data.overtureId },
        update: withoutCode(data),
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
    const code = cleanString(input.code);
    if (!code) errors.push("Code is required.");
    if (!cleanString(input.name)) errors.push("Name is required.");
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
        source: cleanString(input.source) || "manual-import",
        sourceVersion: cleanString(input.sourceVersion)
      },
      errors
    };
  }

  private overtureFeatureData(
    feature: OvertureFeature,
    code: string,
    options: ImportOptions
  ) {
    const properties = featureProperties(feature);
    const overtureId = cleanString(feature.id) || cleanString(properties.id);

    if (!overtureId) {
      return null;
    }

    const bbox = this.spatialService.readBbox(feature.bbox ?? properties.bbox);
    const geometry = feature.geometry ?? properties.geometry;
    const centroid = this.spatialService.centroidFromBbox(bbox) || this.spatialService.centroidFromGeometry(geometry);
    const name = this.primaryName(feature.names ?? properties.names);
    const sourceVersion = options.sourceVersion || cleanString(properties.version);

    return this.crudService.propertyData(
      {
        code,
        overtureId,
        name,
        addressLine: cleanString(properties.addressLine ?? properties.address_line),
        street: cleanString(properties.street),
        ward: cleanString(properties.ward) || options.defaultWard,
        district: cleanString(properties.district) || options.defaultDistrict,
        city: DEFAULT_CITY,
        propertyType: DEFAULT_PROPERTY_TYPE,
        status: DEFAULT_STATUS,
        source: OVERTURE_SOURCE,
        sourceVersion,
        level: numberValue(properties.level),
        height: numberValue(properties.height),
        floors: integerValue(properties.num_floors),
        areaSqm: numberValue(properties.areaSqm ?? properties.area_sqm),
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

  private primaryName(value: unknown) {
    if (!value) {
      return undefined;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const item = value as { primary?: unknown; common?: unknown };
      return cleanString(item.primary) || cleanString(item.common);
    }

    const text = cleanString(value);
    const match = text?.match(/primary['"]?\s*:\s*['"]([^'"]+)['"]/);
    return match?.[1] || text;
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
