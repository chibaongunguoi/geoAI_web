const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const refLat = 16.08597;
  const refLng = 108.21839;
  const targetCategory = "hotel";
  const distanceMeters = 500;
  
  console.log("Testing relational search...");
  const targetRows = await prisma.$queryRawUnsafe(`
    SELECT id, name, category, address, ST_X(location::geometry) as "centroidLng", ST_Y(location::geometry) as "centroidLat",
      ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
    FROM "Place"
    WHERE category ILIKE '%' || $3 || '%'
      AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6)
    UNION ALL
    SELECT id, name, "propertyType" as category, '' as address, "centroidLng", "centroidLat",
      ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography) as distance
    FROM "BuildingProperty"
    WHERE "propertyType" ILIKE '%' || $9 || '%'
      AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography, $12)
    ORDER BY distance ASC
    LIMIT 5
  `, refLng, refLat, targetCategory, refLng, refLat, distanceMeters,
     refLng, refLat, targetCategory, refLng, refLat, distanceMeters);

  console.log("Targets:", targetRows);

  console.log("Testing risk query...");
  const riskType = "flood";
  const district = "Hải Châu";
  const riskRows = await prisma.$queryRawUnsafe(`
    SELECT p.id, p.name, p."propertyType" as category
    FROM "BuildingProperty" p
    JOIN "RiskZone" r ON ST_Intersects(p.geom, r.geom)
    WHERE r."zoneType" = $1
      AND p.district ILIKE '%' || $2 || '%'
    LIMIT 5
  `, riskType, district);
  console.log("Risk Targets:", riskRows);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
