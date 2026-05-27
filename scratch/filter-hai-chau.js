const Database = require("better-sqlite3");
const { resolve } = require("path");

function filterDB() {
  const dbPath = resolve("geoai_data/geoai.db"); 
  try {
    const db = new Database(dbPath);
    
    console.log("Before deletion:");
    console.log(db.prepare(`SELECT "district", COUNT(*) as count FROM "BuildingProperty" GROUP BY "district" ORDER BY count DESC`).all());
    
    console.log("Deleting non-Hai Chau properties...");
    const result = db.prepare(`DELETE FROM "BuildingProperty" WHERE "district" != 'Hải Châu' OR "district" IS NULL`).run();
    console.log(`Deleted ${result.changes} rows.`);
    
    console.log("Vacuuming DB to reclaim space...");
    db.prepare(`VACUUM`).run();
    
    console.log("After deletion:");
    console.log(db.prepare(`SELECT "district", COUNT(*) as count FROM "BuildingProperty" GROUP BY "district" ORDER BY count DESC`).all());
    
    db.close();
  } catch (err) {
    console.error("DB error:", err);
  }
}
filterDB();
