const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const prisma = new PrismaClient();

function tryParseJSON(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (d.getFullYear() > 2100 || d.getFullYear() < 1900) {
    return new Date();
  }
  return d;
}

const tableToModel = {
  'User': 'user',
  'Role': 'role',
  'Permission': 'permission',
  'UserRole': 'userRole',
  'RolePermission': 'rolePermission',
  'Session': 'session',
  'AuditLog': 'auditLog',
  'LayerUserConfig': 'layerUserConfig',
  'AssetDisplayUserConfig': 'assetDisplayUserConfig',
  'Report': 'report',
  'Notification': 'notification',
  'Place': 'place'
};

async function importTable(tableName) {
  const jsonlPath = path.join(__dirname, `../../geoai_data/${tableName}.jsonl`);
  if (!fs.existsSync(jsonlPath)) return;
  
  console.log(`Importing ${tableName}...`);
  const fileStream = fs.createReadStream(jsonlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let batch = [];
  let count = 0;
  const modelName = tableToModel[tableName];

  for await (const line of rl) {
    const row = JSON.parse(line);
    
    if (row.createdAt) row.createdAt = parseDate(row.createdAt);
    if (row.updatedAt) row.updatedAt = parseDate(row.updatedAt);
    if (row.deletedAt) row.deletedAt = parseDate(row.deletedAt);
    if (row.expiresAt) row.expiresAt = parseDate(row.expiresAt);
    if (row.revokedAt) row.revokedAt = parseDate(row.revokedAt);
    
    if (tableName === 'Place') {
      row.subcategories = tryParseJSON(row.subcategories) || [];
      row.geometry = tryParseJSON(row.geometry);
      row.riskFlags = tryParseJSON(row.riskFlags) || [];
      delete row.location;
    } else if (tableName === 'AuditLog') {
      row.metadata = tryParseJSON(row.metadata);
    } else if (tableName === 'LayerUserConfig' || tableName === 'AssetDisplayUserConfig') {
      row.state = tryParseJSON(row.state);
    } else if (tableName === 'Notification') {
      row.isRead = Boolean(row.isRead);
    }

    batch.push(row);

    if (batch.length >= 10000) {
      await prisma[modelName].createMany({
        data: batch,
        skipDuplicates: true
      });
      count += batch.length;
      console.log(`Imported ${count} rows into ${tableName}`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma[modelName].createMany({
      data: batch,
      skipDuplicates: true
    });
    count += batch.length;
    console.log(`Imported ${count} rows into ${tableName}`);
  }
}

async function main() {
  const tables = ['User', 'Role', 'Permission', 'UserRole', 'RolePermission', 'Session', 'AuditLog', 'LayerUserConfig', 'AssetDisplayUserConfig', 'Report', 'Notification', 'Place'];
  for (const table of tables) {
    await importTable(table);
  }
  console.log("Done importing small tables!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
