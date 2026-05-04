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
    "filters.use",
    "ai.query",
    "measurement.use",
    "export.use",
    "share.create",
    "assets.importExport"
  ],
  ADMIN: [...PERMISSION_KEYS]
};

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
    await prisma.rolePermission.createMany({
      data: keys.map((key) => ({
        roleId: role.id,
        permissionId: permissionByKey.get(key)!.id
      })),
      skipDuplicates: true
    });
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

  const simpleAdminHash = await hasher.hash("admin123");
  const simpleAdmin = await prisma.user.upsert({
    where: { username: "admin123" },
    update: {
      email: "admin123@local.geoai",
      name: "Admin 123",
      passwordHash: simpleAdminHash
    },
    create: {
      username: "admin123",
      email: "admin123@local.geoai",
      name: "Admin 123",
      passwordHash: simpleAdminHash
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: simpleAdmin.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: simpleAdmin.id,
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
