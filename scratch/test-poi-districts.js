const Database = require("better-sqlite3");
const { resolve } = require("path");

function testQuery() {
  const dbPath = resolve("geoai_data/geoai.db"); 
  try {
    const db = new Database(dbPath, { readonly: true });
    
    // Check propertyTypes that match POI categories
    const sql = `
      SELECT "district", COUNT(*) as count
      FROM "BuildingProperty"
      WHERE "deletedAt" IS NULL 
        AND "propertyType" IN ('cafe', 'coffee_shop', 'restaurant', 'food', 'dining', 'hotel', 'hospital', 'school', 'university')
      GROUP BY "district"
      ORDER BY count DESC
    `;
    
    console.log("Executing query...");
    const rows = db.prepare(sql).all();
    console.log(rows);
    db.close();
  } catch (err) {
    console.error("DB error:", err);
  }
}
testQuery();
