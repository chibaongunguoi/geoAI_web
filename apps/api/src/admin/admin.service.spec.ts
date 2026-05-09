import { BadRequestException } from "@nestjs/common";
import { AdminService } from "./admin.service";

function prismaStub(overrides = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: "user-1" }),
      findMany: jest.fn(),
      update: jest.fn()
    },
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([
        { id: "role-user", code: "USER" },
        { id: "role-manager", code: "MANAGER" }
      ])
    },
    userRole: {
      deleteMany: jest.fn(),
      createMany: jest.fn()
    },
    permission: {
      findMany: jest.fn()
    },
    rolePermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn()
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    ...overrides
  };
}

describe("AdminService", () => {
  it("when roles are updated, assigns only requested valid roles", async () => {
    const prisma = prismaStub();
    const service = new AdminService(prisma);

    await service.updateUserRoles("user-1", ["USER", "MANAGER"], "admin-1");

    expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" }
    });
    expect(prisma.userRole.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-1", roleId: "role-user" },
        { userId: "user-1", roleId: "role-manager" }
      ],
      skipDuplicates: true
    });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("when the last admin would be removed, rejects the role update", async () => {
    const prisma = prismaStub({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "admin-user",
          roles: [{ role: { code: "ADMIN" } }]
        }),
        findMany: jest.fn().mockResolvedValue([])
      }
    });
    const service = new AdminService(prisma);

    await expect(
      service.updateUserRoles("admin-user", ["USER"], "admin-user")
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("filters users by search text and role code", async () => {
    const prisma = prismaStub();
    const service = new AdminService(prisma);

    await service.listUsers({ search: "field", role: "MANAGER" });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { email: { contains: "field", mode: "insensitive" } },
                { username: { contains: "field", mode: "insensitive" } },
                { name: { contains: "field", mode: "insensitive" } }
              ]
            },
            {
              roles: {
                some: {
                  role: {
                    code: "MANAGER"
                  }
                }
              }
            }
          ]
        }
      })
    );
  });

  it("locks a user account and records audit history", async () => {
    const prisma = prismaStub({
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: "user-1", status: "ACTIVE" }),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: "user-1", status: "LOCKED" })
      }
    });
    const service = new AdminService(prisma);

    await expect(service.updateUserStatus("user-1", "LOCKED", "admin-1")).resolves.toEqual({
      id: "user-1",
      status: "LOCKED"
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { status: "LOCKED" }
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        action: "admin.users.status.update",
        entityType: "User",
        entityId: "user-1",
        metadata: { status: "LOCKED" }
      })
    });
  });

  it("rejects invalid user status updates", async () => {
    const service = new AdminService(prismaStub());

    await expect(service.updateUserStatus("user-1", "DISABLED", "admin-1")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("filters audit logs by action, entity, actor, and date range", async () => {
    const prisma = prismaStub();
    const service = new AdminService(prisma);

    await service.listAuditLogs({
      action: "admin.users.roles.update",
      entityType: "User",
      actorUserId: "admin-1",
      from: "2026-05-01",
      to: "2026-05-09"
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        action: { contains: "admin.users.roles.update" },
        entityType: "User",
        actorUserId: "admin-1",
        createdAt: {
          gte: new Date("2026-05-01T00:00:00.000Z"),
          lte: new Date("2026-05-09T23:59:59.999Z")
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true
          }
        }
      }
    });
  });
});
