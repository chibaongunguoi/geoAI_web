const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchNasaLandslides() {
  console.log('Fetching NASA Landslides for Vietnam area...');
  // Bounding box for Vietnam approximate: 102.1, 8.5, 109.5, 23.4
  // We use Socrata API for NASA Global Landslide Catalog
  // Using SoQL: where=within_box(geolocation, 23.4, 102.1, 8.5, 109.5)
  const url = 'https://data.nasa.gov/resource/dd9e-wu2v.json?$where=within_box(geolocation,23.4,102.1,8.5,109.5)&$limit=5000';
  
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`NASA API returned ${response.status}`);
    const data = await response.json();
    
    let inserted = 0;
    for (const item of data) {
      if (!item.geolocation || !item.geolocation.coordinates) continue;
      const lng = item.geolocation.coordinates[0];
      const lat = item.geolocation.coordinates[1];
      
      const delta = 0.001; 
      const polygon = `{"type":"Polygon","coordinates":[[[${lng-delta},${lat-delta}],[${lng+delta},${lat-delta}],[${lng+delta},${lat+delta}],[${lng-delta},${lat+delta}],[${lng-delta},${lat-delta}]]]}`;
      
      const id = `nasa-${item.source_link || item.id || Math.random()}`;
      const desc = `${item.landslide_trigger || 'Unknown trigger'} - ${item.landslide_size || 'Unknown size'} (${item.event_title || ''})`;
      const riskLevel = item.landslide_size === 'Large' || item.landslide_size === 'Very_large' ? 'High' : 'Medium';

      await prisma.$executeRawUnsafe(`
        INSERT INTO "RiskZone" (id, "zoneType", "riskLevel", source, description, geom, "updatedAt")
        VALUES ($1, 'landslide', $2, 'NASA GLC', $3, ST_GeomFromGeoJSON($4), NOW())
        ON CONFLICT (id) DO NOTHING
      `, id, riskLevel, desc, polygon);
      inserted++;
    }
    console.log(`Inserted ${inserted} landslide zones from NASA.`);
  } catch (err) {
    console.error('Failed to fetch NASA Landslides:', err.message);
  }
}

async function fetchOSMFlood() {
  console.log('Fetching OSM Flood areas for Vietnam (Da Nang)...');
  // We'll focus on Da Nang to keep it lightweight for now, or just use a small bbox
  const query = `
    [out:json][timeout:25];
    area["name"="Đà Nẵng"]->.searchArea;
    (
      way["flood_prone"="yes"](area.searchArea);
      way["hazard"="flood"](area.searchArea);
      way["natural"="water"](area.searchArea);
    );
    out geom;
  `;
  const url = 'https://overpass-api.de/api/interpreter';
  
  const response = await fetch(url, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  
  if (!response.ok) throw new Error(`Overpass API returned ${response.status}`);
  const data = await response.json();
  
  let inserted = 0;
  if (!data.elements) return console.log('No OSM flood data found.');
  
  for (const el of data.elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    
    // Convert to GeoJSON Polygon if closed, or LineString if open (we'll just buffer it later or treat as polygon if closed)
    const isClosed = el.geometry[0].lat === el.geometry[el.geometry.length-1].lat && el.geometry[0].lon === el.geometry[el.geometry.length-1].lon;
    if (!isClosed) continue; // Only handle closed polygons for RiskZone
    
    const coordinates = el.geometry.map(p => [p.lon, p.lat]);
    const geojson = JSON.stringify({
      type: "Polygon",
      coordinates: [coordinates]
    });
    
    const id = `osm-${el.id}`;
    const desc = el.tags ? (el.tags.name || el.tags.water || 'Khu vực mặt nước/ngập') : 'Khu vực mặt nước/ngập';
    // If it's just natural=water, we might classify it as low flood risk for demo, if it's flood_prone=yes then high
    const riskLevel = el.tags && (el.tags.flood_prone === 'yes' || el.tags.hazard === 'flood') ? 'High' : 'Low';

    await prisma.$executeRawUnsafe(`
      INSERT INTO "RiskZone" (id, "zoneType", "riskLevel", source, description, geom, "updatedAt")
      VALUES ($1, 'flood', $2, 'OpenStreetMap', $3, ST_GeomFromGeoJSON($4), NOW())
      ON CONFLICT (id) DO NOTHING
    `, id, riskLevel, desc, geojson);
    inserted++;
  }
  console.log(`Inserted ${inserted} flood zones from OSM.`);
}

async function main() {
  // Clear mock data first
  await prisma.$executeRawUnsafe(`DELETE FROM "RiskZone" WHERE source = 'Mock Data'`);
  console.log('Cleared mock data.');
  
  await fetchNasaLandslides();
  await fetchOSMFlood();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
