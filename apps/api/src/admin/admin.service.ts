import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ROLE_CODES, RoleCode } from "../rbac/rbac.constants";
import { AuditLogService } from "./audit-log.service";

type Delegate = {
  findMany?: (args?: unknown) => Promise<unknown[]>;
  findUnique?: (args: unknown) => Promise<unknown>;
  create?: (args: unknown) => Promise<unknown>;
  update?: (args: unknown) => Promise<unknown>;
  deleteMany?: (args: unknown) => Promise<unknown>;
  createMany?: (args: unknown) => Promise<unknown>;
};

type AdminPrisma = {
  user: Required<Pick<Delegate, "findMany" | "findUnique" | "update">>;
  role: Required<Pick<Delegate, "findMany" | "findUnique">>;
  userRole: Required<Pick<Delegate, "deleteMany" | "createMany">>;
  permission: Required<Pick<Delegate, "findMany">>;
  rolePermission: Required<Pick<Delegate, "deleteMany" | "createMany">>;
};

type UserWithRoles = {
  id: string;
  roles?: Array<{ role: { code: string } }>;
};

type IdRow = {
  id: string;
};

type ListUsersInput = {
  search?: string;
  role?: string;
};

const USER_STATUSES = ["ACTIVE", "LOCKED"] as const;
type UserStatus = (typeof USER_STATUSES)[number];

@Injectable()
export class AdminService {
  constructor(
    @Inject(PrismaService) private readonly prisma: AdminPrisma,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService
  ) {}

  listUsers(input?: string | ListUsersInput) {
    const filters = typeof input === "string" ? { search: input } : input || {};
    const andFilters: Record<string, unknown>[] = [];

    if (filters.search) {
      andFilters.push({
        OR: [
          { email: { contains: filters.search, mode: "insensitive" } },
          { username: { contains: filters.search, mode: "insensitive" } },
          { name: { contains: filters.search, mode: "insensitive" } }
        ]
      });
    }

    if (this.validRoleCode(filters.role)) {
      andFilters.push({
        roles: {
          some: {
            role: {
              code: filters.role
            }
          }
        }
      });
    }

    return this.prisma.user.findMany({
      where: andFilters.length > 0 ? { AND: andFilters } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        roles: { include: { role: true } }
      }
    });
  }

  async updateUserRoles(userId: string, roleCodes: string[], actorUserId?: string) {
    const requestedRoleCodes = this.validRoleCodes(roleCodes);
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    })) as UserWithRoles | null;

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.ensureAdminRemains(user, requestedRoleCodes);

    const roles = (await this.prisma.role.findMany({
      where: { code: { in: requestedRoleCodes } }
    })) as IdRow[];

    await this.prisma.userRole.deleteMany({ where: { userId } });
    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({ userId, roleId: role.id })),
      skipDuplicates: true
    });
    await this.auditLogService.logAction({
      actorUserId,
      action: "admin.users.roles.update",
      entityType: "User",
      entityId: userId,
      metadata: {
        roles: requestedRoleCodes
      }
    });

    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    });
  }

  async updateUserStatus(userId: string, status: string, actorUserId?: string) {
    const nextStatus = this.validUserStatus(status);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: nextStatus }
    });

    await this.auditLogService.logAction({
      actorUserId,
      action: "admin.users.status.update",
      entityType: "User",
      entityId: userId,
      metadata: {
        status: nextStatus
      }
    });

    return updated;
  }

  listRoles() {
    return this.prisma.role.findMany({
      orderBy: { code: "asc" },
      include: { permissions: { include: { permission: true } } }
    });
  }

  async updateRolePermissions(roleId: string, permissionKeys: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    const permissions = (await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } }
    })) as IdRow[];

    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    await this.prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } }
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }]
    });
  }

  private validRoleCodes(roleCodes: string[]): RoleCode[] {
    return roleCodes.filter((roleCode): roleCode is RoleCode =>
      ROLE_CODES.includes(roleCode as RoleCode)
    );
  }

  private validRoleCode(roleCode?: string): roleCode is RoleCode {
    return ROLE_CODES.includes(roleCode as RoleCode);
  }

  private validUserStatus(status: string): UserStatus {
    if (USER_STATUSES.includes(status as UserStatus)) {
      return status as UserStatus;
    }

    throw new BadRequestException("User status is invalid");
  }

  private async ensureAdminRemains(
    user: { id: string; roles?: Array<{ role: { code: string } }> },
    nextRoleCodes: RoleCode[]
  ) {
    const currentRoles = user.roles ?? [];
    const isCurrentlyAdmin = currentRoles.some((item) => item.role.code === "ADMIN");
    const remainsAdmin = nextRoleCodes.includes("ADMIN");

    if (!isCurrentlyAdmin || remainsAdmin) {
      return;
    }

    const otherAdmins = await this.prisma.user.findMany({
      where: {
        id: { not: user.id },
        roles: {
          some: {
            role: {
              code: "ADMIN"
            }
          }
        }
      },
      take: 1
    });

    if (otherAdmins.length > 0) {
      return;
    }

    throw new BadRequestException("Cannot remove the final admin role");
  }
}
