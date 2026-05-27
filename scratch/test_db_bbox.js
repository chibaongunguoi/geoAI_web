const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../geoai_data/geoai.db');
const db = new Database(dbPath, { readonly: true });

const query = `
  SELECT id, name, propertyType, centroidLat, centroidLng 
  FROM BuildingProperty 
  WHERE centroidLat >= 16.035 AND centroidLat <= 16.103
    AND centroidLng >= 108.188 AND centroidLng <= 108.249
  LIMIT 5
`;
const props = db.prepare(query).all();
console.log('Properties in Da Nang bbox:', props.length);
if (props.length > 0) {
  console.log(props);
}
db.close();
