import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("users")
  @RequirePermissions("admin.users.view")
  listUsers(@Query("search") search?: string, @Query("role") role?: string) {
    return this.admin.listUsers({ search, role });
  }

  @Patch("users/:id/roles")
  @RequirePermissions("admin.users.manage")
  updateUserRoles(
    @Param("id") id: string,
    @Body() body: { roles?: string[] },
    @Req() request: Request
  ) {
    const actor = request as Request & { user?: { sub?: string; id?: string } };
    return this.admin.updateUserRoles(id, body.roles || [], actor.user?.sub || actor.user?.id);
  }

  @Patch("users/:id/status")
  @RequirePermissions("admin.users.manage")
  updateUserStatus(
    @Param("id") id: string,
    @Body() body: { status?: string },
    @Req() request: Request
  ) {
    const actor = request as Request & { user?: { sub?: string; id?: string } };
    return this.admin.updateUserStatus(id, body.status || "", actor.user?.sub || actor.user?.id);
  }

  @Get("roles")
  @RequirePermissions("admin.roles.view")
  listRoles() {
    return this.admin.listRoles();
  }

  @Patch("roles/:id/permissions")
  @RequirePermissions("admin.roles.manage")
  updateRolePermissions(
    @Param("id") id: string,
    @Body() body: { permissions?: string[] }
  ) {
    return this.admin.updateRolePermissions(id, body.permissions || []);
  }

  @Get("permissions")
  @RequirePermissions("admin.permissions.view")
  listPermissions() {
    return this.admin.listPermissions();
  }

  @Get("audit-logs")
  @RequirePermissions("admin.logs.view")
  listAuditLogs(
    @Query("action") action?: string,
    @Query("entityType") entityType?: string,
    @Query("actorUserId") actorUserId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.admin.listAuditLogs({ action, entityType, actorUserId, from, to });
  }
}
