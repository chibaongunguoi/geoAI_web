# Product Backlog Progress

This file records what is already implemented or only partially implemented. Forward-looking recommendations and next-session plans belong in [next-session-semantic-search.md](./next-session-semantic-search.md).

## Completed

### RBAC foundation

- `EP02-029` - Added `admin.apiKeys.manage` permission key for future API key management. API key CRUD and per-action guards are not implemented yet.
- `EP02-046` - Seeded `USER`, `MANAGER`, `ADMIN`; added role-permission assignment API foundation.
- `EP02-063` - Seeded feature permission catalog and admin permission listing.
- `EP02-082` - Added shared `admin.logs.view` permission foundation. Dedicated API log ingestion/model is still pending.
- `EP02-099` - Added audit log listing endpoint guarded by `admin.logs.view`, plus filtered admin audit log UI.
- `EP02-134` - Seeded default role permission sets for `USER`, `MANAGER`, and `ADMIN`.

### Auth registration and admin role management

- Added public registration. New accounts are created as `USER`.
- Added `username` to `User` with a unique Prisma migration.
- Login now accepts username or email through `identifier`, while keeping email compatibility.
- Seed now creates/updates `admin123/admin123` with the `ADMIN` role and keeps the existing secondary admin account.
- Admin users dashboard now lists username, email, name, status, and roles.
- Admin users dashboard supports search by name/username/email and filtering by role.
- Admins with `admin.users.manage` can assign/revoke `USER`, `MANAGER`, and `ADMIN` roles.
- Admins with `admin.users.manage` can lock/unlock accounts through `PATCH /admin/users/:id/status`; status changes are recorded in audit logs.
- Backend prevents removing the final remaining `ADMIN` role.
- Role changes are recorded in audit logs.
- Added a read-only role-permission matrix view for auditing permission coverage by role.

### Map basemap slice

- `EP01-001` - Display default basemap after login.
- `EP01-002` - Switch between OSM, satellite, and terrain basemaps.
- `EP01-003` - Enable smooth multi-level map zoom through Leaflet controls and scroll-wheel zoom.
- `EP01-004` - Enable map panning by dragging.
- `EP01-005` - Remember the previously selected basemap.
- `EP01-006` - Show source information for basemap layers.
- `EP01-008` - Limit zoom level per basemap.
- `EP01-010` - Show pointer coordinates on map hover.
- `EP01-011` - Show map scale control.
- `EP01-014` - Enable fullscreen map mode.

### Data layer management slice

- `EP01-018` - Added a data layer panel listing available layers.
- `EP01-019` - Added per-layer visibility toggles for administrative boundaries, sample assets, and AI scan results.
- `EP01-020` - Added drag/drop layer ordering, with button controls as an accessible fallback.
- `EP01-021` - Added per-layer opacity controls and Leaflet opacity application.
- `EP01-022` - Added layer group metadata and group-level visibility toggles.
- `EP01-023` - Added layer search across name, group, source type, source, and keywords.
- `EP01-024` - Added per-layer legend metadata and visible legend swatches.
- `EP01-026` - Added and enforced min/max zoom thresholds per data layer.
- `EP01-027` - Added load status display for administrative boundaries, sample assets, and AI scan results.
- `EP01-028` - Added config-driven external layer loading for GeoJSON, WMS, and WMTS/XYZ URL-template sources.
- `EP01-029` - Added per-layer refresh controls and load error reporting for configured external layers.
- `EP01-030` - Added server-backed per-user layer configuration persistence with localStorage fallback.
- `EP01-031` - Added recent layer-management operation history from audit logs.
- `EP01-032` - Added JSON export for saved layer configuration and recent layer history.
- `EP01-033` - Added `layers.manage` gating for layer changes, refresh, and export while keeping `layers.view` read access.
- `EP01-034` - Added visible error alerts for active layer-management failures.

### Asset display slice

- `EP01-035` - Added dedicated asset markers with category-specific icons.
- `EP01-036` - Added clickable asset popups with configurable summary fields.
- `EP01-037` - Added asset popup links to `/assets/[code]` detail pages.
- `EP01-038` - Added status indicators on asset markers.
- `EP01-039` - Added deterministic low-zoom asset clustering without a new dependency.
- `EP01-040` - Added configurable asset labels by code or name.
- `EP01-041` - Added representative asset thumbnails in popups.
- `EP01-042` - Added asset coloring by type or priority.
- `EP01-044` - Highlighted recently updated assets on the map.
- `EP01-045` - Added configurable popup fields with role-gated advanced fields.
- `EP01-046` - Added viewport-based asset loading through `/api/map/assets?bbox=...`.
- `EP01-047` - Added server-backed per-user asset display configuration with localStorage fallback.
- `EP01-048` - Added recent asset-display operation history from audit logs.
- `EP01-049` - Added JSON export for visible assets and persisted asset display metadata.
- `EP01-050` - Added asset display permission behavior using existing `layers.view` and `assets.importExport`.
- `EP01-051` - Added visible asset display error reporting in the map sidebar.

### Da Nang building/property management slice

- Added PostgreSQL-backed `BuildingProperty` catalog for Da Nang buildings/properties with Overture IDs, geometry, centroid, address/admin fields, management status, raw attributes, and normalized search text.
- Added guarded Nest API endpoints for property search, detail, create, update, soft delete, and Overture building import/upsert.
- Added Next route proxies for `/api/properties`, `/api/properties/[id]`, and `/api/properties/import/overture`.
- Added real Overture GeoPackage import tooling with ward/district enrichment from cached Da Nang GADM ward boundaries.
- Added Vietnamese natural-language count answers for ward/district building questions, including accented and no-accent matching such as `phường hòa khánh bắc thuộc liên chiểu`.
- Added Vietnamese density intent search for questions like `vùng nào ở hòa khánh bắc có số lượng nhà dày đặc nhất`; the API returns a text answer plus map-ready density regions.
- Added web map rendering for density-search output, including the top density bbox, scan-style building boxes, answer text, and auto-zoom/focus to the densest region.
- Added normal property result list/table switching for Vietnamese natural-language and keyword search results.
- Added sample Vietnamese question chips, local recent-search/recent-question history with `keyword` vs `nl-question` tags, and clear ambiguity warnings for overly broad natural-language queries.
- Added status/type condition parsing for Vietnamese/no-accent natural-language property queries, including active, inactive, review, archived, and building type filters.
- Added selected normal-result map focus/highlight and coordinate-query map focus support.
- Added property search suggestions through `/api/properties/suggestions` and the matching Next.js proxy route.
- Added asset CRUD foundation pages: `/assets`, `/assets/new`, `/assets/[code]`, and `/assets/[code]/edit`.
- Added shared asset create/edit form wired to the existing property create/update proxy, including status/type/address/area/coordinate fields.
- Added paginated asset list table with search, status filter, sort controls, and detail/edit links.
- Replaced the placeholder asset detail page with full property details, map preview, edit action, and audit timeline.
- Added entity-specific audit-log filtering with `entityId` so property detail timelines can show changes for one asset.
- Preserved existing sample asset popup detail links through a server-side fallback to `public/data/sample-assets.geojson` when no database property matches the route code.
- Applied the migration and seeded `properties.view`, `properties.manage`, and `properties.import`.

### Elasticsearch + MiniLM search infrastructure

- Added Elasticsearch 8.x as the chosen optional search projection, with PostgreSQL kept as source of truth and hydration source.
- Added `@elastic/elasticsearch` to the API workspace.
- Added provider-based property search infrastructure:
  - PostgreSQL normalized/fuzzy search fallback.
  - Elasticsearch hybrid lexical + semantic provider.
  - Fallback warnings when Elasticsearch or the embedding service is unavailable.
- Added Elasticsearch index support for `building_properties_v1` with `dense_vector` embeddings using 384 dimensions and cosine similarity.
- Added `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` embedding service for Vietnamese-compatible semantic vectors.
- Added local search operations assets:
  - `docker-compose.search.yml`
  - `scripts/property_embedding_service.py`
  - `scripts/index_building_properties.py`
  - `scripts/test_index_building_properties.py`
- Embeddings are stored only in Elasticsearch, not in Neon/PostgreSQL.

### Stability fixes

- Hardened the web auth fetch path so the main page does not hard-crash when the Nest API is unavailable.
- Hardened web API proxies so backend connection failures return controlled 503 JSON responses.
- Fixed the property density map path so `propertySearchResult` reaches the Leaflet component that draws and zooms the density bbox.
- Hardened property-search suggestions in the web UI so non-array or failed responses do not crash the search panel.

### Verification checkpoints

- Phase 2 Vietnamese NL/search UX: `npm run test:api`, `npm run test:web`, and `npm run build` passed after implementing result table, samples, condition parsing, ambiguity warnings, typed history, suggestions, and selected-result focus.
- Phase 3 admin foundation: `npm run test:api`, `npm run test:web`, and `npm run build` passed after implementing audit log UI, user filtering, lock/unlock, and permission matrix.
- Phase 4 asset CRUD foundation: `npm run test:api`, `npm run test:web`, and `npm run build` passed after implementing asset create/edit/list/detail pages, entity-specific audit timelines, and sample asset detail fallback.

## Partially Implemented / Foundation Only

- `EP02-029` - Permission key exists for API key management, but API key CRUD is still pending.
- `EP02-082` - Shared log permission and audit-log UI exist, but dedicated API log ingestion/listing is still pending.
- `EP02-099` - Audit log UI exists; richer system log workflows beyond audit-log filtering are still pending.
- `EP01-052` - Property keyword search, result list/table, suggestions, and selected-result focus exist; dedicated source-specific modes are still pending.
- `EP01-062` and `EP04-005` - Accented/no-accent matching exists for property search and Vietnamese count/density/list conditions. Broader parser coverage can still expand with more business-specific cases.
- `EP04-001` to `EP04-007` and `EP04-009` - Vietnamese natural-language property queries now support count, density, list/table results, sample questions, status/type/location conditions, recent history, and ambiguity warnings. Favorites, Excel/export, backend audit/history for NL actions, role-specific NL access review, and SQL review remain pending.
- `EP03-001`, `EP03-002`, `EP03-004`, and `EP03-005` - Asset create/edit/list/detail foundations are implemented against the existing property API. Delete workflows, bulk actions, import/export, validation polish, media/files, richer map coordinate picking, and the remaining EP03 items are still pending.
- Da Nang building/property import is now clean for `Liên Chiểu` only on the current Neon database. The previous `manual-demo` rows were removed, staging tables were dropped after import, and the table now has `63,445` trusted `source='overture'` rows for Liên Chiểu.
- Liên Chiểu row counts by GADM ward: `Hòa Minh` 18,657; `Hòa Khánh Bắc` 14,300; `Hòa Khánh Nam` 14,039; `Hòa Hiệp Nam` 8,878; `Hòa Hiệp Bắc` 7,571.
- The direct PostgreSQL importer supports `--dry-run`, advisory locking, staging/upsert resume, storage preflight, `--district`, and `--ward` filters. For the Liên Chiểu reload it was run with `--batch-size 1000`; each staging/upsert batch commits independently.
- Da Nang building/property search supports an optional Elasticsearch/MiniLM provider through `PROPERTY_SEARCH_PROVIDER=elasticsearch`. PostgreSQL normalized lexical search remains the automatic fallback when Elasticsearch or the embedding service is unavailable.

## Handoff

Next actions and recommendations are tracked in [next-session-semantic-search.md](./next-session-semantic-search.md).
