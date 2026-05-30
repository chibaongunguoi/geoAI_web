import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { PropertiesCrudService } from "./properties.crud.service";
import { PropertiesSearchService } from "./properties.search.service";
import { PropertiesSpatialService } from "./properties.spatial.service";
import { PropertiesImportService } from "./properties.import.service";
import { Delegate, PropertiesPrisma, PropertyStatus, BuildingPropertyRow, PropertyDensityRegion, PropertySearchMap, PropertyDensityObject, PropertySearchAnswer, SearchIntent, DensityRegionRow, PropertySearchInput, PropertyHeatmapInput, PropertyMutationInput, AssetImportResult, ImportOptions, OvertureFeature, DEFAULT_CITY, DEFAULT_PROPERTY_TYPE, DEFAULT_STATUS, DEFAULT_SOURCE, OVERTURE_SOURCE, MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_DENSITY_GRID_SIZE, DEFAULT_DENSITY_REGION_LIMIT, DEFAULT_DENSITY_OBJECT_LIMIT, DENSITY_BACKEND_TIMEOUT_MS, SEMANTIC_PROVIDER_TIMEOUT_MS, LIST_SEARCH_TIMEOUT_MS, DEFAULT_EMBEDDING_MODEL, VALID_STATUSES, STOP_WORDS_FOR_TOKENS, LOWEST_DENSITY_PHRASES, HIGHEST_DENSITY_PHRASES, DENSITY_INTENT_KEYWORDS, INTENT_KEYWORDS, STATIC_LOCATIONS, DANANG_DISTRICTS, PropertiesServiceOptions, PROPERTIES_SERVICE_OPTIONS } from "./properties.types";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    sub?: string;
  };
};

@Controller("properties")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PropertiesController {
  constructor(
    private readonly crudService: PropertiesCrudService,
    private readonly searchService: PropertiesSearchService,
    private readonly spatialService: PropertiesSpatialService,
    private readonly importService: PropertiesImportService
  ) {}

  @Get()
  @RequirePermissions("search.use")
  search(@Query() query: Record<string, string | undefined>) {
    return this.searchService.searchProperties({
      query: query.query,
      street: query.street,
      ward: query.ward,
      district: query.district,
      status: query.status,
      propertyType: query.propertyType,
      source: query.source,
      updatedFrom: query.updatedFrom,
      updatedTo: query.updatedTo,
      limit: Number(query.limit || 20)
    } satisfies PropertySearchInput);
  }

  @Get("suggestions")
  @RequirePermissions("search.use")
  getSuggestions(@Query("q") q: string) {
    return this.searchService.getSuggestions(q);
  }

  @Get("heatmap")
  @RequirePermissions("search.use")
  getBuildingHeatmap(@Query() query: Record<string, string | undefined>) {
    return this.spatialService.getBuildingHeatmap({
      ward: query.ward,
      district: query.district,
      source: query.source || "all",
      limit: Number(query.limit || 1800),
      gridSize: query.gridSize ? Number(query.gridSize) : 0.0012
    });
  }

  @Get(":id")
  @RequirePermissions("properties.view")
  getProperty(@Param("id") id: string) {
    return this.crudService.getProperty(id);
  }

  @Post()
  @RequirePermissions("properties.manage")
  createProperty(@Req() request: AuthenticatedRequest, @Body() body: PropertyMutationInput) {
    return this.crudService.createProperty(body, this.userId(request));
  }

  @Patch(":id")
  @RequirePermissions("properties.manage")
  updateProperty(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: PropertyMutationInput
  ) {
    return this.crudService.updateProperty(id, body, this.userId(request));
  }

  @Delete(":id")
  @RequirePermissions("properties.manage")
  deleteProperty(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.crudService.deleteProperty(id, this.userId(request));
  }

  @Post("import/overture")
  @RequirePermissions("properties.import")
  importOvertureBuildings(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      features?: unknown[];
      sourceVersion?: string;
      defaultWard?: string;
      defaultDistrict?: string;
    }
  ) {
    return this.importService.importOvertureBuildings(body.features || [], {
      actorUserId: this.userId(request),
      sourceVersion: body.sourceVersion,
      defaultWard: body.defaultWard,
      defaultDistrict: body.defaultDistrict
    });
  }

  @Post("import/assets")
  @RequirePermissions("properties.import")
  importAssets(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      rows?: PropertyMutationInput[];
      sourceVersion?: string;
    }
  ) {
    return this.importService.importAssetRows(body.rows || [], {
      actorUserId: this.userId(request),
      sourceVersion: body.sourceVersion
    });
  }

  private userId(request: AuthenticatedRequest) {
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException("Authenticated user is required");
    }

    return userId;
  }
}
