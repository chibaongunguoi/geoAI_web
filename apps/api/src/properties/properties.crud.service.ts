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
import { formatCode, searchableText, validLatitude, validLongitude, validOptionalNumber, validOptionalInteger, cleanString } from "./properties.utils";
import { Delegate, PropertiesPrisma, PropertyStatus, BuildingPropertyRow, PropertyDensityRegion, PropertySearchMap, PropertyDensityObject, PropertySearchAnswer, SearchIntent, DensityRegionRow, PropertySearchInput, PropertyHeatmapInput, PropertyMutationInput, AssetImportResult, ImportOptions, OvertureFeature, DEFAULT_CITY, DEFAULT_PROPERTY_TYPE, DEFAULT_STATUS, DEFAULT_SOURCE, OVERTURE_SOURCE, MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_DENSITY_GRID_SIZE, DEFAULT_DENSITY_REGION_LIMIT, DEFAULT_DENSITY_OBJECT_LIMIT, DENSITY_BACKEND_TIMEOUT_MS, SEMANTIC_PROVIDER_TIMEOUT_MS, LIST_SEARCH_TIMEOUT_MS, DEFAULT_EMBEDDING_MODEL, VALID_STATUSES, STOP_WORDS_FOR_TOKENS, LOWEST_DENSITY_PHRASES, HIGHEST_DENSITY_PHRASES, DENSITY_INTENT_KEYWORDS, INTENT_KEYWORDS, STATIC_LOCATIONS, DANANG_DISTRICTS, PropertiesServiceOptions, PROPERTIES_SERVICE_OPTIONS } from "./properties.types";

@Injectable()
export class PropertiesCrudService {
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
    options: PropertiesServiceOptions = {}
  ) {
    this.configuredElasticsearchProvider = options?.elasticsearchProvider;
    this.propertySearchProvider = options?.propertySearchProvider;
  }

  async getProperty(id: string) {
    const property = await this.findProperty(id);
    return property;
  }

  async createProperty(input: PropertyMutationInput, actorUserId?: string) {
    let code = input.code;
    if (!code) {
      const count = await this.prisma.buildingProperty.count();
      code = formatCode(count + 1);
    }

    const data = this.propertyData(input, {
      code,
      city: input.city || DEFAULT_CITY,
      propertyType: input.propertyType || DEFAULT_PROPERTY_TYPE,
      source: input.source || DEFAULT_SOURCE,
      status: input.status || DEFAULT_STATUS
    });
    
    try {
      const created = (await this.prisma.buildingProperty.create({ data })) as BuildingPropertyRow;

      await this.writeAudit(actorUserId, "properties.create", created.id, {
        code: created.code
      });

      return created;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException("Mã tài sản đã tồn tại trong hệ thống");
      }
      throw error;
    }
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

  private async findProperty(id: string) {
    const property = (await this.prisma.buildingProperty.findUnique({
      where: { id }
    })) as BuildingPropertyRow | undefined;

    if (!property || property.deletedAt) {
      throw new NotFoundException("Property not found");
    }

    return property;
  }

  public propertyData(
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
    const searchText = searchableText(candidate);

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

    const centroidLat = validLatitude(input.centroidLat ?? existing.centroidLat);
    const centroidLng = validLongitude(input.centroidLng ?? existing.centroidLng);
    const height = validOptionalNumber(input.height ?? existing.height, "height");
    const areaSqm = validOptionalNumber(input.areaSqm ?? existing.areaSqm, "areaSqm");
    const level = validOptionalNumber(input.level ?? existing.level, "level");
    const floors = validOptionalInteger(input.floors ?? existing.floors, "floors");

    return {
      code: cleanString(input.code) || defaults.code,
      overtureId: cleanString(input.overtureId) ?? existing.overtureId,
      name: cleanString(input.name) ?? existing.name,
      addressLine: cleanString(input.addressLine) ?? existing.addressLine,
      street: cleanString(input.street) ?? existing.street,
      ward: cleanString(input.ward) ?? existing.ward,
      district: cleanString(input.district) ?? existing.district,
      city: cleanString(input.city) || existing.city || defaults.city,
      propertyType:
        cleanString(input.propertyType) || existing.propertyType || defaults.propertyType,
      status,
      source: cleanString(input.source) || existing.source || defaults.source,
      sourceVersion: cleanString(input.sourceVersion) ?? existing.sourceVersion,
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
