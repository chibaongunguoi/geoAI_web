const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const prisma = new PrismaClient();
const jsonlPath = path.join(__dirname, '../../geoai_data/buildings.jsonl');

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
  // Prevent out of range errors
  if (d.getFullYear() > 2100 || d.getFullYear() < 1900) {
    return new Date();
  }
  return d;
}

async function main() {
  const fileStream = fs.createReadStream(jsonlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let batch = [];
  let count = 0;

  for await (const line of rl) {
    const row = JSON.parse(line);
    
    // Process JSON fields
    row.bbox = tryParseJSON(row.bbox);
    row.geometry = tryParseJSON(row.geometry);
    row.attributes = tryParseJSON(row.attributes);
    row.embedding = tryParseJSON(row.embedding);
    row.riskFlags = tryParseJSON(row.riskFlags);
    
    // Remove geom since it's an Unsupported PostGIS column and we'll update it later if needed
    delete row.geom;
    
    // Process Dates
    row.createdAt = parseDate(row.createdAt);
    row.updatedAt = parseDate(row.updatedAt);
    if (row.deletedAt) row.deletedAt = parseDate(row.deletedAt);
    
    batch.push(row);

    if (batch.length >= 10000) {
      await prisma.buildingProperty.createMany({
        data: batch,
        skipDuplicates: true
      });
      count += batch.length;
      console.log(`Imported ${count} rows into Postgres`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma.buildingProperty.createMany({
      data: batch,
      skipDuplicates: true
    });
    count += batch.length;
    console.log(`Imported ${count} rows into Postgres`);
  }
  
  console.log("Done importing to Postgres!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
