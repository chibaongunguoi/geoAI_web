import { Body, Controller, Get, Put, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { MapLayersService } from "./map-layers.service";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    sub?: string;
  };
};

@Controller("map/layers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MapLayersController {
  constructor(private readonly layers: MapLayersService) {}

  @Get("config")
  @RequirePermissions("layers.view")
  getConfig(@Req() request: AuthenticatedRequest) {
    return this.layers.getConfig(this.userId(request));
  }

  @Put("config")
  @RequirePermissions("layers.manage")
  saveConfig(@Req() request: AuthenticatedRequest, @Body() body: { state?: unknown }) {
    return this.layers.saveConfig(this.userId(request), body.state);
  }

  @Get("history")
  @RequirePermissions("layers.view")
  getHistory(@Req() request: AuthenticatedRequest, @Query("take") take?: string) {
    return this.layers.getHistory(this.userId(request), Number(take || 20));
  }

  @Get("export")
  @RequirePermissions("layers.manage")
  exportConfig(@Req() request: AuthenticatedRequest) {
    return this.layers.exportConfig(this.userId(request));
  }

  private userId(request: AuthenticatedRequest) {
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException("Authenticated user is required");
    }

    return userId;
  }
}
