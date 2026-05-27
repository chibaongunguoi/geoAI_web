const Database = require("better-sqlite3");
const { resolve } = require("path");

function testQuery() {
  const dbPath = resolve("geoai_data/geoai.db"); // Fallback path, might need to adjust
  console.log("DB path:", dbPath);
  
  try {
    const db = new Database(dbPath, { readonly: true });
    
    const sql = `
      SELECT "id", "code", "name", "propertyType", "district"
      FROM "BuildingProperty"
      WHERE "deletedAt" IS NULL AND "propertyType" IN ('cafe', 'coffee_shop', 'restaurant', 'food', 'dining') AND "district" = 'Hải Châu'
      ORDER BY "name" ASC
      LIMIT 15
    `;
    
    console.log("Executing query...");
    const start = Date.now();
    const rows = db.prepare(sql).all();
    console.log(`Query took ${Date.now() - start}ms, returned ${rows.length} rows.`);
    db.close();
  } catch (err) {
    console.error("DB error:", err);
  }
}
testQuery();
