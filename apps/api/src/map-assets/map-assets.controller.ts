import { Body, Controller, Get, Put, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { MapAssetsService } from "./map-assets.service";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    sub?: string;
  };
};

@Controller("map/assets")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MapAssetsController {
  constructor(private readonly assets: MapAssetsService) {}

  @Get("config")
  @RequirePermissions("layers.view")
  getConfig(@Req() request: AuthenticatedRequest) {
    return this.assets.getConfig(this.userId(request));
  }

  @Put("config")
  @RequirePermissions("assets.importExport")
  saveConfig(@Req() request: AuthenticatedRequest, @Body() body: { state?: unknown }) {
    return this.assets.saveConfig(this.userId(request), body.state);
  }

  @Get("history")
  @RequirePermissions("layers.view")
  getHistory(@Req() request: AuthenticatedRequest, @Query("take") take?: string) {
    return this.assets.getHistory(this.userId(request), Number(take || 20));
  }

  @Get("export")
  @RequirePermissions("assets.importExport")
  exportConfig(@Req() request: AuthenticatedRequest) {
    return this.assets.exportConfig(this.userId(request));
  }

  private userId(request: AuthenticatedRequest) {
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException("Authenticated user is required");
    }

    return userId;
  }
}
