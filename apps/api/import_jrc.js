const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const geojsonPath = 'e:\\DUAN\\geoAI_web\\geoai_data\\danang_flood.geojson';
  console.log('Reading GeoJSON...');
  const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  
  console.log(`Loaded ${data.features.length} features.`);
  
  // Clear mock data if any
  await prisma.$executeRawUnsafe(`DELETE FROM "RiskZone" WHERE source = 'Mock Data'`);
  
  // Also clear old JRC data to avoid duplicates
  await prisma.$executeRawUnsafe(`DELETE FROM "RiskZone" WHERE source = 'JRC Global Surface Water'`);

  let inserted = 0;
  for (const feature of data.features) {
    const dn = feature.properties.DN;
    // 0 = No water, 255 = No data (or occasionally 0 for occurrence depending on masking)
    if (dn === 0 || dn === 255) continue;
    
    // Occurrence 1-100%
    const riskLevel = dn >= 50 ? 'High' : 'Medium';
    const id = `jrc-flood-${Math.random().toString(36).substr(2, 9)}`;
    const desc = `Khu vực có tần suất xuất hiện nước/ngập: ${dn}% (JRC Water Occurrence)`;
    
    // We convert the geometry back to string to use ST_GeomFromGeoJSON
    const geomStr = JSON.stringify(feature.geometry);
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO "RiskZone" (id, "zoneType", "riskLevel", source, description, geom, "updatedAt")
      VALUES ($1, 'flood', $2, 'JRC Global Surface Water', $3, ST_GeomFromGeoJSON($4), NOW())
    `, id, riskLevel, desc, geomStr);
    
    inserted++;
    if (inserted % 100 === 0) console.log(`Inserted ${inserted} flood zones...`);
  }
  
  console.log(`Successfully inserted ${inserted} JRC flood zones.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
