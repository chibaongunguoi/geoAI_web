import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { PoiSearchService } from "./poi-search.service";
import { PoiSemanticService } from "./poi-semantic.service";
import { PoiImportService } from "./poi-import.service";
import { PoiImportFeature } from "./poi.types";

type AuthenticatedRequest = {
  user?: { id?: string; sub?: string };
};

@Controller("poi")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PoiController {
  constructor(
    private readonly searchService: PoiSearchService,
    private readonly semanticService: PoiSemanticService,
    private readonly importService: PoiImportService
  ) {}

  @Get("search")
  @RequirePermissions("search.use")
  searchByCategory(
    @Query("q") q: string,
    @Query("south") south?: string,
    @Query("west") west?: string,
    @Query("north") north?: string,
    @Query("east") east?: string,
    @Query("limit") limit?: string
  ) {
    return this.searchService.searchByCategory({
      q: q || "",
      south: south ? Number(south) : undefined,
      west: west ? Number(west) : undefined,
      north: north ? Number(north) : undefined,
      east: east ? Number(east) : undefined,
      limit: limit ? Number(limit) : undefined
    });
  }

  @Get("semantic-search")
  @RequirePermissions("search.use")
  semanticSearch(
    @Query("q") q: string,
    @Query("limit") limit?: string
  ) {
    return this.semanticService.semanticSearch(q || "", limit ? Number(limit) : undefined);
  }

  @Post("import")
  @RequirePermissions("properties.import")
  importPlaces(
    @Body() body: { features?: PoiImportFeature[]; sourceVersion?: string }
  ) {
    return this.importService.importPlaces(
      body.features || [],
      body.sourceVersion
    );
  }

  @Post("convert/:placeId")
  @RequirePermissions("properties.manage")
  convertToAsset(
    @Param("placeId") placeId: string,
    @Req() request: AuthenticatedRequest
  ) {
    const userId = request.user?.sub || request.user?.id || "unknown";
    return this.importService.convertToAsset(placeId, userId);
  }
}
