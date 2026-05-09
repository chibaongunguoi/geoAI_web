-- Seed one committed Hai Chau demo batch.
-- Usage with psql:
--   \set start_id 2001
--   \set end_id 3000
--   \i scripts/seed_hai_chau_demo_batch.sql

BEGIN;

INSERT INTO "BuildingProperty" (
  "id",
  "code",
  "name",
  "addressLine",
  "street",
  "ward",
  "district",
  "city",
  "propertyType",
  "status",
  "source",
  "sourceVersion",
  "areaSqm",
  "centroidLat",
  "centroidLng",
  "bbox",
  "attributes",
  "searchText",
  "searchTextNormalized",
  "createdAt",
  "updatedAt"
)
SELECT
  'demo_hc_' || lpad(n::text, 6, '0'),
  'DN-HC-' || lpad(n::text, 6, '0'),
  'Hai Chau batch building ' || n,
  ((10 + (n % 190))::text || ' Hai Chau Demo Street'),
  'Hai Chau Demo Street',
  'Hai Chau Demo Ward',
  'Hai Chau',
  'Da Nang',
  'building',
  'ACTIVE',
  'manual-demo',
  'hai-chau-batch-2026-05-05',
  (80 + (n % 70))::double precision,
  (16.050000 + ((n % 120)::double precision * 0.0001)),
  (108.200000 + ((n % 160)::double precision * 0.0001)),
  jsonb_build_object(
    'xmin', 108.200000 + ((n % 160)::double precision * 0.0001) - 0.00004,
    'ymin', 16.050000 + ((n % 120)::double precision * 0.0001) - 0.00004,
    'xmax', 108.200000 + ((n % 160)::double precision * 0.0001) + 0.00004,
    'ymax', 16.050000 + ((n % 120)::double precision * 0.0001) + 0.00004
  ),
  jsonb_build_object('demo', true, 'batch', floor((n - 1) / 1000) + 1),
  'DN-HC-' || lpad(n::text, 6, '0') || ' Hai Chau batch building ' || n ||
    ' Hai Chau Demo Street Hai Chau Demo Ward Hai Chau Da Nang building ACTIVE manual-demo',
  lower(
    'dn hc ' || lpad(n::text, 6, '0') || ' hai chau batch building ' || n ||
      ' hai chau demo street hai chau demo ward hai chau da nang building active manual demo'
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM generate_series(:start_id, :end_id) AS n
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "addressLine" = EXCLUDED."addressLine",
  "street" = EXCLUDED."street",
  "ward" = EXCLUDED."ward",
  "district" = EXCLUDED."district",
  "city" = EXCLUDED."city",
  "propertyType" = EXCLUDED."propertyType",
  "status" = EXCLUDED."status",
  "source" = EXCLUDED."source",
  "sourceVersion" = EXCLUDED."sourceVersion",
  "areaSqm" = EXCLUDED."areaSqm",
  "centroidLat" = EXCLUDED."centroidLat",
  "centroidLng" = EXCLUDED."centroidLng",
  "bbox" = EXCLUDED."bbox",
  "attributes" = EXCLUDED."attributes",
  "searchText" = EXCLUDED."searchText",
  "searchTextNormalized" = EXCLUDED."searchTextNormalized",
  "deletedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;

COMMIT;
