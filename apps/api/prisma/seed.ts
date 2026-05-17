import { PrismaClient } from "@prisma/client";
import { PasswordHasher } from "../src/auth/password-hasher";
import { PERMISSION_KEYS } from "../src/rbac/rbac.constants";

const prisma = new PrismaClient();
const hasher = new PasswordHasher();

const rolePermissions = {
  USER: [
    "map.view",
    "map.scan",
    "layers.view",
    "search.use",
    "properties.view",
    "dashboard.view",
    "filters.use",
    "ai.query",
    "measurement.use"
  ],
  MANAGER: [
    "map.view",
    "map.scan",
    "layers.view",
    "layers.manage",
    "search.use",
    "properties.view",
    "properties.manage",
    "properties.import",
    "dashboard.view",
    "filters.use",
    "ai.query",
    "measurement.use",
    "export.use",
    "share.create",
    "assets.importExport"
  ],
  ADMIN: [...PERMISSION_KEYS]
};

async function upsertTestUser(input: {
  username: string;
  password: string;
  roleCode: "USER" | "MANAGER" | "ADMIN";
  name: string;
}) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { code: input.roleCode }
  });
  const passwordHash = await hasher.hash(input.password);
  const user = await prisma.user.upsert({
    where: { username: input.username },
    update: {
      email: `${input.username}@local.geoai`,
      name: input.name,
      passwordHash,
      status: "ACTIVE"
    },
    create: {
      username: input.username,
      email: `${input.username}@local.geoai`,
      name: input.name,
      passwordHash,
      status: "ACTIVE"
    }
  });

  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: role.id
    }
  });
}

async function main() {
  const permissions = await Promise.all(
    PERMISSION_KEYS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          group: key.split(".")[0],
          name: key
        }
      })
    )
  );

  const permissionByKey = new Map(
    permissions.map((permission) => [permission.key, permission])
  );

  for (const [code, keys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code === "USER" ? "Người dùng" : code === "MANAGER" ? "Cán bộ quản lý" : "Admin"
      }
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const key of keys) {
      const permId = permissionByKey.get(key)!.id;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
        update: {},
        create: { roleId: role.id, permissionId: permId }
      });
    }
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "ADMIN" }
  });
  const passwordHash = await hasher.hash(
    process.env.SEED_ADMIN_PASSWORD || "Admin123!"
  );
  const admin = await prisma.user.upsert({
    where: { email: "admin@geoai.local" },
    update: { username: "admin", passwordHash },
    create: {
      username: "admin",
      email: "admin@geoai.local",
      name: "GeoAI Admin",
      passwordHash
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id
    }
  });

  await upsertTestUser({
    username: "admin123",
    password: "admin123",
    roleCode: "ADMIN",
    name: "Admin 123"
  });
  await upsertTestUser({
    username: "manager123",
    password: "manager123",
    roleCode: "MANAGER",
    name: "Manager 123"
  });
  await upsertTestUser({
    username: "user123",
    password: "user123",
    roleCode: "USER",
    name: "User 123"
  });

  // Ngô Hồ Minh Hưng account
  const hungHash = await hasher.hash("nemesiscat060");
  const hung = await prisma.user.upsert({
    where: { email: "nemesiscat060@gmail.com" },
    update: {
      username: "nemesiscat",
      name: "Ngô Hồ Minh Hưng",
      passwordHash: hungHash
    },
    create: {
      username: "nemesiscat",
      email: "nemesiscat060@gmail.com",
      name: "Ngô Hồ Minh Hưng",
      passwordHash: hungHash
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: hung.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: hung.id,
      roleId: adminRole.id
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
