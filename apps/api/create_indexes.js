const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Creating GiST index on BuildingProperty.geom...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_building_property_geom ON "BuildingProperty" USING GIST(geom);
  `);

  console.log("Creating GiST index on Place.location...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_place_location ON "Place" USING GIST(location);
  `);

  console.log("Creating GiST index on RiskZone.geom...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_risk_zone_geom ON "RiskZone" USING GIST(geom);
  `);

  console.log("Done creating GiST indexes.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
