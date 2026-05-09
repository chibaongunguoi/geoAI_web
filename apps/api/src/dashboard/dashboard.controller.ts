import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { DashboardService, DashboardSummaryInput } from "./dashboard.service";

export const DASHBOARD_PERMISSION = "dashboard.view";

@Controller("dashboard/assets")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("summary")
  @RequirePermissions(DASHBOARD_PERMISSION)
  getAssetSummary(@Query() query: DashboardSummaryInput) {
    return this.dashboard.getAssetSummary(query);
  }
}
