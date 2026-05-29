-- Create PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "BuildingProperty" ADD COLUMN     "geom" geometry(Geometry, 4326);

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "location" geometry(Point, 4326);

-- Populate geom from centroid Lat/Lng
UPDATE "BuildingProperty"
SET "geom" = ST_SetSRID(ST_MakePoint("centroidLng", "centroidLat"), 4326)
WHERE "centroidLng" IS NOT NULL AND "centroidLat" IS NOT NULL;

-- Create spatial index on BuildingProperty
CREATE INDEX "building_property_geom_idx" ON "BuildingProperty" USING GIST ("geom");

-- Populate location from latitude/longitude
UPDATE "Place"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)
WHERE "longitude" IS NOT NULL AND "latitude" IS NOT NULL;

-- Create spatial index on Place
CREATE INDEX "place_location_idx" ON "Place" USING GIST ("location");
