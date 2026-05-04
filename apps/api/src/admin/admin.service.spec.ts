import { BadRequestException } from "@nestjs/common";
import { AdminService } from "./admin.service";

function prismaStub(overrides = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: "user-1" }),
      findMany: jest.fn()
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
});
