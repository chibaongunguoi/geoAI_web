const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../geoai_data/geoai.db'), { readonly: true });

const sql = `
  SELECT id, code, name, propertyType, centroidLat, centroidLng
  FROM BuildingProperty
  WHERE deletedAt IS NULL
  AND centroidLat >= 16.035 AND centroidLat <= 16.103
  AND centroidLng >= 108.188 AND centroidLng <= 108.249
  ORDER BY updatedAt DESC
  LIMIT 120
`;

const places = db.prepare(sql).all();
console.log('Total items returned by POI search:', places.length);

const withCoords = places.filter(p => p.centroidLat && p.centroidLng);
console.log('Items with non-null coords:', withCoords.length);

// Simulate the API mapping
const items = places.map(place => ({
  id: place.id,
  code: place.code,
  name: place.name || place.code,
  category: place.propertyType,
  latitude: place.centroidLat || 0,
  longitude: place.centroidLng || 0,
  centroidLat: place.centroidLat || 0,
  centroidLng: place.centroidLng || 0,
}));

const validItems = items.filter(item => 
  Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)) &&
  item.latitude !== 0 && item.longitude !== 0
);

console.log('Valid items (non-zero coords):', validItems.length);

if (validItems.length > 0) {
  console.log('First 3 items:');
  validItems.slice(0, 3).forEach(i => console.log('  ', JSON.stringify(i)));
}

db.close();
