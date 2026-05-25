const { resolve } = require('path');
const Database = require('better-sqlite3');
const dbPath = resolve(__dirname, 'prisma', '../../../geoai_data/geoai.db');
console.log('DB path:', dbPath);
const db = new Database(dbPath);

const sql = `
WITH filtered AS (
  SELECT centroidLat, centroidLng, ward, district
  FROM BuildingProperty
  WHERE deletedAt IS NULL
    AND source = ?
    AND centroidLat IS NOT NULL
    AND centroidLng IS NOT NULL
), cells AS (
  SELECT
    CAST(centroidLat / ? AS INTEGER) AS lat_cell,
    CAST(centroidLng / ? AS INTEGER) AS lng_cell,
    COUNT(*) AS count,
    AVG(centroidLat) AS center_lat,
    AVG(centroidLng) AS center_lng,
    MIN(centroidLat) AS min_lat,
    MIN(centroidLng) AS min_lng,
    MAX(centroidLat) AS max_lat,
    MAX(centroidLng) AS max_lng,
    MIN(ward) AS ward,
    MIN(district) AS district
  FROM filtered
  GROUP BY lat_cell, lng_cell
)
SELECT
  (lat_cell || ':' || lng_cell) AS cellId,
  count,
  center_lat AS centerLat,
  center_lng AS centerLng,
  min_lat AS minLat,
  min_lng AS minLng,
  max_lat AS maxLat,
  max_lng AS maxLng,
  (lat_cell * ?) AS cellSouth,
  (lng_cell * ?) AS cellWest,
  ((lat_cell + 1) * ?) AS cellNorth,
  ((lng_cell + 1) * ?) AS cellEast,
  ward,
  district
FROM cells
ORDER BY count DESC, center_lat ASC, center_lng ASC
LIMIT ?
`;

const params = ['overture', 0.0035, 0.0035, 0.0035, 0.0035, 0.0035, 0.0035, 1200];
const rows = db.prepare(sql).all(...params);
console.log('Rows:', rows.length);
