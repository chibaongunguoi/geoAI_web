const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../geoai_data/geoai.db');
const db = new Database(dbPath, { readonly: true });
const count = db.prepare('SELECT count(*) as c FROM BuildingProperty').get().c;
console.log('Total properties in DB:', count);

const sample = db.prepare('SELECT id, name, propertyType, centroidLat, centroidLng FROM BuildingProperty LIMIT 5').all();
console.log('Sample properties:', sample);
db.close();
