const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    INSERT INTO "RiskZone" (id, "zoneType", "riskLevel", source, description, geom, "updatedAt")
    VALUES 
    ('mock-1', 'flood', 'High', 'Mock Data', 'Khu vực Hải Châu ngập sâu khi mưa lớn', ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[108.21,16.06],[108.225,16.06],[108.225,16.07],[108.21,16.07],[108.21,16.06]]]}'), NOW()),
    ('mock-2', 'landslide', 'Medium', 'Mock Data', 'Nguy cơ sạt lở đèo Hải Vân', ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[108.13,16.18],[108.15,16.18],[108.15,16.20],[108.13,16.20],[108.13,16.18]]]}'), NOW()),
    ('mock-3', 'flood', 'Low', 'Mock Data', 'Khu vực ven sông Hàn', ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[108.225,16.04],[108.235,16.04],[108.235,16.06],[108.225,16.06],[108.225,16.04]]]}'), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('Inserted mock risk zones.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
