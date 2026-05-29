const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.$queryRawUnsafe(`
  SELECT id, ST_Area(geom) as area
  FROM "RiskZone" 
  WHERE ST_Intersects(geom, ST_MakeEnvelope(107.82, 15.88, 108.35, 16.25, 4326))
    AND ST_Area(geom) < 0.01
  ORDER BY ST_Area(geom) DESC
  LIMIT 10
`)
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
