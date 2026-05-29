const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const gridSize = 0.0012;
const limit = 1800;

async function main() {
    const params = [
      gridSize,
      gridSize,
      gridSize,
      gridSize,
      gridSize,
      gridSize,
      limit
    ];
    
    try {
      const rows = await prisma.$queryRawUnsafe(`
        WITH filtered AS (
          SELECT
            "centroidLat",
            "centroidLng",
            "ward",
            "district"
          FROM "BuildingProperty"
          WHERE "deletedAt" IS NULL
            AND "centroidLat" IS NOT NULL
            AND "centroidLng" IS NOT NULL
        ),
        cells AS (
          SELECT
            CAST("centroidLat" / $1 AS INTEGER) AS lat_cell,
            CAST("centroidLng" / $2 AS INTEGER) AS lng_cell,
            COUNT(*) AS count,
            AVG("centroidLat") AS center_lat,
            AVG("centroidLng") AS center_lng,
            MIN("centroidLat") AS min_lat,
            MIN("centroidLng") AS min_lng,
            MAX("centroidLat") AS max_lat,
            MAX("centroidLng") AS max_lng,
            MIN("ward") AS ward,
            MIN("district") AS district
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
          (lat_cell * $3) AS cellSouth,
          (lng_cell * $4) AS cellWest,
          ((lat_cell + 1) * $5) AS cellNorth,
          ((lng_cell + 1) * $6) AS cellEast,
          ward,
          district
        FROM cells
        ORDER BY count DESC, center_lat ASC, center_lng ASC
        LIMIT $7
        `, ...params);
        console.log("First row:", rows[0]);
    } catch (err) {
        console.error("Error:", err);
    }
}
main().finally(() => prisma.$disconnect());
