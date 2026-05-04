CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE "BuildingProperty" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "overtureId" TEXT,
  "name" TEXT,
  "addressLine" TEXT,
  "street" TEXT,
  "ward" TEXT,
  "district" TEXT,
  "city" TEXT NOT NULL DEFAULT 'Da Nang',
  "propertyType" TEXT NOT NULL DEFAULT 'building',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "sourceVersion" TEXT,
  "level" DOUBLE PRECISION,
  "height" DOUBLE PRECISION,
  "floors" INTEGER,
  "areaSqm" DOUBLE PRECISION,
  "centroidLat" DOUBLE PRECISION,
  "centroidLng" DOUBLE PRECISION,
  "bbox" JSONB,
  "geometry" JSONB,
  "attributes" JSONB,
  "searchText" TEXT NOT NULL DEFAULT '',
  "searchTextNormalized" TEXT NOT NULL DEFAULT '',
  "embedding" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "BuildingProperty_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BuildingProperty_code_key" ON "BuildingProperty"("code");
CREATE UNIQUE INDEX "BuildingProperty_overtureId_key" ON "BuildingProperty"("overtureId");
CREATE INDEX "BuildingProperty_city_district_ward_idx" ON "BuildingProperty"("city", "district", "ward");
CREATE INDEX "BuildingProperty_street_idx" ON "BuildingProperty"("street");
CREATE INDEX "BuildingProperty_status_idx" ON "BuildingProperty"("status");
CREATE INDEX "BuildingProperty_source_overtureId_idx" ON "BuildingProperty"("source", "overtureId");
CREATE INDEX "BuildingProperty_deletedAt_idx" ON "BuildingProperty"("deletedAt");
CREATE INDEX "BuildingProperty_searchTextNormalized_idx" ON "BuildingProperty"("searchTextNormalized");
CREATE INDEX "BuildingProperty_searchTextNormalized_trgm_idx"
  ON "BuildingProperty" USING gin ("searchTextNormalized" gin_trgm_ops);
