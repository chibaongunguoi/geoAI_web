const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Updating BuildingProperty geom...");
  await prisma.$executeRawUnsafe(`
    UPDATE "BuildingProperty"
    SET geom = ST_SetSRID(ST_MakePoint("centroidLng", "centroidLat"), 4326)
    WHERE "centroidLat" IS NOT NULL AND "centroidLng" IS NOT NULL AND geom IS NULL;
  `);

  console.log("Updating Place location...");
  await prisma.$executeRawUnsafe(`
    UPDATE "Place"
    SET location = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)
    WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL AND location IS NULL;
  `);

  console.log("Done updating geometry columns.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
