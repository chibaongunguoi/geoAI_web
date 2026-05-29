/**
 * Migration script: SQLite → PostgreSQL
 * 
 * Reads all data from the old SQLite database and inserts into PostgreSQL.
 * Run with: npx ts-node --project tsconfig.json scripts/migrate-sqlite-to-postgres.ts
 */
import Database = require('better-sqlite3');
import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';

const SQLITE_PATH = resolve(__dirname, '..', '..', '..', 'geoai_data', 'geoai.db');
const BATCH_SIZE = 500;

const prisma = new PrismaClient();

function openSqlite() {
  const db = new Database(SQLITE_PATH, { readonly: true, timeout: 60000 });
  db.pragma('journal_mode = WAL');
  return db;
}

function countRows(db: Database.Database, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get() as { count: number };
  return row.count;
}

function allRows(db: Database.Database, table: string, offset: number, limit: number): any[] {
  return db.prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`).all(limit, offset);
}

function parseJsonField(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

function parseDateField(value: any): Date | null {
  if (value === null || value === undefined) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function parseBoolField(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return false;
}

async function migrateTable(
  db: Database.Database,
  tableName: string,
  insertFn: (row: any) => Promise<void>
) {
  const total = countRows(db, tableName);
  console.log(`\n📦 Migrating "${tableName}" — ${total.toLocaleString()} rows`);

  if (total === 0) {
    console.log(`   ⏭ Skipped (empty table)`);
    return;
  }

  let migrated = 0;
  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const rows = allRows(db, tableName, offset, BATCH_SIZE);
    for (const row of rows) {
      try {
        await insertFn(row);
        migrated++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          // Duplicate key — skip
          migrated++;
        } else {
          console.error(`   ❌ Error at row ${migrated + 1}:`, err.message?.slice(0, 200));
        }
      }
    }
    const pct = Math.min(100, Math.round((migrated / total) * 100));
    process.stdout.write(`\r   [${migrated.toLocaleString()}/${total.toLocaleString()}] ${pct}%`);
  }
  console.log(`\n   ✅ Done — ${migrated.toLocaleString()} rows migrated`);
}

async function main() {
  console.log('🚀 SQLite → PostgreSQL Migration');
  console.log(`   Source: ${SQLITE_PATH}`);
  console.log(`   Target: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`);

  const db = openSqlite();

  // 1. Users
  await migrateTable(db, 'User', async (row) => {
    await prisma.user.create({
      data: {
        id: row.id,
        username: row.username,
        email: row.email,
        name: row.name,
        passwordHash: row.passwordHash,
        status: row.status || 'ACTIVE',
        createdAt: parseDateField(row.createdAt) || new Date(),
        updatedAt: parseDateField(row.updatedAt) || new Date(),
      }
    });
  });

  // 2. Roles
  await migrateTable(db, 'Role', async (row) => {
    await prisma.role.create({
      data: {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        createdAt: parseDateField(row.createdAt) || new Date(),
        updatedAt: parseDateField(row.updatedAt) || new Date(),
      }
    });
  });

  // 3. Permissions
  await migrateTable(db, 'Permission', async (row) => {
    await prisma.permission.create({
      data: {
        id: row.id,
        key: row.key,
        group: row.group,
        name: row.name,
        description: row.description,
        createdAt: parseDateField(row.createdAt) || new Date(),
        updatedAt: parseDateField(row.updatedAt) || new Date(),
      }
    });
  });

  // 4. UserRole
  await migrateTable(db, 'UserRole', async (row) => {
    await prisma.userRole.create({
      data: { userId: row.userId, roleId: row.roleId }
    });
  });

  // 5. RolePermission
  await migrateTable(db, 'RolePermission', async (row) => {
    await prisma.rolePermission.create({
      data: { roleId: row.roleId, permissionId: row.permissionId }
    });
  });

  // 6. Session
  await migrateTable(db, 'Session', async (row) => {
    await prisma.session.create({
      data: {
        id: row.id,
        userId: row.userId,
        refreshToken: row.refreshToken,
        expiresAt: parseDateField(row.expiresAt) || new Date(),
        revokedAt: parseDateField(row.revokedAt),
        createdAt: parseDateField(row.createdAt) || new Date(),
      }
    });
  });

  // 7. AuditLog
  await migrateTable(db, 'AuditLog', async (row) => {
    await prisma.auditLog.create({
      data: {
        id: row.id,
        actorUserId: row.actorUserId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: parseJsonField(row.metadata),
        createdAt: parseDateField(row.createdAt) || new Date(),
      }
    });
  });

  // 8. LayerUserConfig
  await migrateTable(db, 'LayerUserConfig', async (row) => {
    await prisma.layerUserConfig.create({
      data: {
        userId: row.userId,
        state: parseJsonField(row.state) || {},
        createdAt: parseDateField(row.createdAt) || new Date(),
        updatedAt: parseDateField(row.updatedAt) || new Date(),
      }
    });
  });

  // 9. AssetDisplayUserConfig
  await migrateTable(db, 'AssetDisplayUserConfig', async (row) => {
    await prisma.assetDisplayUserConfig.create({
      data: {
        userId: row.userId,
        state: parseJsonField(row.state) || {},
        createdAt: parseDateField(row.createdAt) || new Date(),
        updatedAt: parseDateField(row.updatedAt) || new Date(),
      }
    });
  });

  // 10. BuildingProperty — THE BIG ONE (~3.94GB)
  await migrateTable(db, 'BuildingProperty', async (row) => {
    await prisma.buildingProperty.create({
      data: {
        id: row.id,
        code: row.code,
        overtureId: row.overtureId,
        name: row.name,
        addressLine: row.addressLine,
        street: row.street,
        ward: row.ward,
        district: row.district,
        city: row.city || 'Da Nang',
        propertyType: row.propertyType || 'building',
        status: row.status || 'ACTIVE',
        source: row.source || 'manual',
        sourceVersion: row.sourceVersion,
        level: row.level !== null ? Number(row.level) : null,
        height: row.height !== null ? Number(row.height) : null,
        floors: row.floors !== null ? Math.trunc(Number(row.floors)) : null,
        areaSqm: row.areaSqm !== null ? Number(row.areaSqm) : null,
        centroidLat: row.centroidLat !== null ? Number(row.centroidLat) : null,
        centroidLng: row.centroidLng !== null ? Number(row.centroidLng) : null,
        bbox: parseJsonField(row.bbox),
        geometry: parseJsonField(row.geometry),
        attributes: parseJsonField(row.attributes),
        searchText: row.searchText || '',
        searchTextNormalized: row.searchTextNormalized || '',
        embedding: parseJsonField(row.embedding),
        createdAt: parseDateField(row.createdAt) || new Date(),
        updatedAt: parseDateField(row.updatedAt) || new Date(),
        deletedAt: parseDateField(row.deletedAt),
      }
    });
  });

  // 11. Place
  await migrateTable(db, 'Place', async (row) => {
    await prisma.place.create({
      data: {
        id: row.id,
        overtureId: row.overtureId,
        name: row.name,
        category: row.category,
        subcategories: parseJsonField(row.subcategories) || [],
        address: row.address,
        street: row.street,
        ward: row.ward,
        district: row.district,
        city: row.city || 'Da Nang',
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        geometry: parseJsonField(row.geometry),
        confidence: Number(row.confidence || 0),
        source: row.source || 'overture-places',
        sourceVersion: row.sourceVersion,
        createdAt: parseDateField(row.createdAt) || new Date(),
        updatedAt: parseDateField(row.updatedAt) || new Date(),
      }
    });
  });

  // 12. Report
  await migrateTable(db, 'Report', async (row) => {
    await prisma.report.create({
      data: {
        id: row.id,
        userId: row.userId,
        reason: row.reason,
        message: row.message,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        status: row.status || 'PENDING',
        responseMessage: row.responseMessage,
        imageUrl: row.imageUrl,
        createdAt: parseDateField(row.createdAt) || new Date(),
        updatedAt: parseDateField(row.updatedAt) || new Date(),
      }
    });
  });

  // 13. Notification
  await migrateTable(db, 'Notification', async (row) => {
    await prisma.notification.create({
      data: {
        id: row.id,
        userId: row.userId,
        title: row.title,
        message: row.message,
        type: row.type,
        isRead: parseBoolField(row.isRead),
        createdAt: parseDateField(row.createdAt) || new Date(),
      }
    });
  });

  // Final verification
  console.log('\n\n📊 Verification — Row counts:');
  const tables = [
    'User', 'Role', 'Permission', 'UserRole', 'RolePermission',
    'Session', 'AuditLog', 'LayerUserConfig', 'AssetDisplayUserConfig',
    'BuildingProperty', 'Place', 'Report', 'Notification'
  ];
  for (const table of tables) {
    const sqliteCount = countRows(db, table);
    const pgCount = await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].count();
    const match = sqliteCount === pgCount ? '✅' : '❌ MISMATCH';
    console.log(`   ${table}: SQLite=${sqliteCount.toLocaleString()} → PG=${pgCount.toLocaleString()} ${match}`);
  }

  db.close();
  await prisma.$disconnect();
  console.log('\n🎉 Migration complete!');
}

main().catch((err) => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
