import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ROLE_CODES, RoleCode } from "../rbac/rbac.constants";

type Delegate = {
  findMany?: (args?: unknown) => Promise<unknown[]>;
  findUnique?: (args: unknown) => Promise<unknown>;
  create?: (args: unknown) => Promise<unknown>;
  deleteMany?: (args: unknown) => Promise<unknown>;
  createMany?: (args: unknown) => Promise<unknown>;
};

type AdminPrisma = {
  user: Required<Pick<Delegate, "findMany" | "findUnique">>;
  role: Required<Pick<Delegate, "findMany" | "findUnique">>;
  userRole: Required<Pick<Delegate, "deleteMany" | "createMany">>;
  permission: Required<Pick<Delegate, "findMany">>;
  rolePermission: Required<Pick<Delegate, "deleteMany" | "createMany">>;
  auditLog: Required<Pick<Delegate, "findMany" | "create">>;
};

type UserWithRoles = {
  id: string;
  roles?: Array<{ role: { code: string } }>;
};

type IdRow = {
  id: string;
};

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private readonly prisma: AdminPrisma) {}

  listUsers(search?: string) {
    return this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } }
            ]
          }
        : undefined,
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
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: "admin.users.roles.update",
        entityType: "User",
        entityId: userId,
        metadata: {
          roles: requestedRoleCodes
        }
      }
    });

    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    });
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

  listAuditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  private validRoleCodes(roleCodes: string[]): RoleCode[] {
    return roleCodes.filter((roleCode): roleCode is RoleCode =>
      ROLE_CODES.includes(roleCode as RoleCode)
    );
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
