const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function replacePlaceholders(sql) {
  let count = 1;
  return sql.replace(/\?/g, () => `$${count++}`);
}

async function testDensityQuery(ward, district, terms) {
  const exactFilters = [
    ward ? `AND "ward" = ?` : "",
    district ? `AND "district" = ?` : ""
  ].join(" ");
  
  const termFilters = terms.map(() => `AND "searchTextNormalized" LIKE ?`).join(" ");
  
  const sql = `
    WITH filtered AS (
      SELECT "centroidLat", "centroidLng", "ward", "district"
      FROM "BuildingProperty"
      WHERE "deletedAt" IS NULL
        AND "centroidLat" IS NOT NULL
        AND "centroidLng" IS NOT NULL
        ${exactFilters}
        ${termFilters}
    ),
    cells AS (
      SELECT
        CAST("centroidLat" / 0.005 AS INTEGER) AS lat_cell,
        CAST("centroidLng" / 0.005 AS INTEGER) AS lng_cell,
        COUNT(*) AS count,
        AVG("centroidLat") AS center_lat,
        AVG("centroidLng") AS center_lng,
        MIN("ward") AS ward,
        MIN("district") AS district
      FROM filtered
      GROUP BY lat_cell, lng_cell
    )
    SELECT (lat_cell || ':' || lng_cell) AS cellId, count, center_lat, center_lng, ward, district
    FROM cells
    ORDER BY count DESC
    LIMIT 5
  `;

  const params = [
    ...[ward, district].filter(Boolean),
    ...terms.map(t => `%${t}%`)
  ];

  console.time('query');
  try {
    const rows = await prisma.$queryRawUnsafe(replacePlaceholders(sql), ...params);
    console.timeEnd('query');
    console.log(`  Results: ${rows.length} regions`);
    for (const r of rows) {
      console.log(`    count=${r.count}, ward=${r.ward}, district=${r.district}`);
    }
  } catch(err) {
    console.timeEnd('query');
    console.error('  ERROR:', err.message);
  }
}

async function testPlaceQuery(ward, district, terms) {
  const exactFilters = [
    ward ? `AND "ward" = ?` : "",
    district ? `AND "district" = ?` : ""
  ].join(" ");
  const termFilters = terms.map(() => `AND ("name" ILIKE ? OR "category" ILIKE ?)`).join(" ");
  
  const sql = `
    SELECT COUNT(*) AS count
    FROM "Place"
    WHERE "location" IS NOT NULL
      ${exactFilters}
      ${termFilters}
  `;
  
  const params = [
    ...[ward, district].filter(Boolean),
    ...terms.flatMap(t => [`%${t}%`, `%${t}%`])
  ];
  
  console.time('place-query');
  try {
    const rows = await prisma.$queryRawUnsafe(replacePlaceholders(sql), ...params);
    console.timeEnd('place-query');
    console.log(`  Place count: ${rows[0].count}`);
  } catch(err) {
    console.timeEnd('place-query');
    console.error('  ERROR:', err.message);
  }
}

async function run() {
  console.log("=== Test 1: khu vực có khách sạn nhiều nhất hải châu ===");
  console.log("  terms=['khach', 'san'], district='Hải Châu'");
  await testDensityQuery(null, 'Hải Châu', ['khach', 'san']);
  await testPlaceQuery(null, 'Hải Châu', ['khach san']);
  
  console.log("\n=== Test 2: khu vực dày đặc nhất thạch thăng, hải châu ===");
  console.log("  terms=[], ward='Thạch Thang', district='Hải Châu'");
  await testDensityQuery('Thạch Thang', 'Hải Châu', []);
  
  console.log("\n=== Test 3: Vùng nào ở phường Thuận Phước có mật độ nhà nhiều nhất? ===");
  console.log("  terms=[], ward='Thuận Phước'");
  await testDensityQuery('Thuận Phước', null, []);
}

run().finally(() => prisma.$disconnect());
