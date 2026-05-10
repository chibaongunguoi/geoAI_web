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
import {
  PropertiesService,
  PropertyMutationInput,
  PropertySearchInput
} from "./properties.service";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    sub?: string;
  };
};

@Controller("properties")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @RequirePermissions("search.use")
  search(@Query() query: Record<string, string | undefined>) {
    return this.properties.searchProperties({
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
    return this.properties.getSuggestions(q);
  }

  @Get(":id")
  @RequirePermissions("properties.view")
  getProperty(@Param("id") id: string) {
    return this.properties.getProperty(id);
  }

  @Post()
  @RequirePermissions("properties.manage")
  createProperty(@Req() request: AuthenticatedRequest, @Body() body: PropertyMutationInput) {
    return this.properties.createProperty(body, this.userId(request));
  }

  @Patch(":id")
  @RequirePermissions("properties.manage")
  updateProperty(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: PropertyMutationInput
  ) {
    return this.properties.updateProperty(id, body, this.userId(request));
  }

  @Delete(":id")
  @RequirePermissions("properties.manage")
  deleteProperty(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.properties.deleteProperty(id, this.userId(request));
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
    return this.properties.importOvertureBuildings(body.features || [], {
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
    return this.properties.importAssetRows(body.rows || [], {
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
