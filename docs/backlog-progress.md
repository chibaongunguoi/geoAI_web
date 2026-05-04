# Product Backlog Progress

## Completed

### RBAC foundation

- `EP02-029` - Added `admin.apiKeys.manage` permission key for future API key management. API key CRUD and per-action guards are not implemented yet.
- `EP02-046` - Seeded `USER`, `MANAGER`, `ADMIN`; added role-permission assignment API foundation.
- `EP02-063` - Seeded feature permission catalog and admin permission listing.
- `EP02-082` - Added shared `admin.logs.view` permission foundation. Dedicated API log model, listing, filters, and UI are not implemented yet.
- `EP02-099` - Added audit log listing endpoint guarded by `admin.logs.view`. Admin UI for system audit logs is not implemented yet.
- `EP02-134` - Seeded default role permission sets for `USER`, `MANAGER`, and `ADMIN`.

### Auth registration and admin role management

- Added public registration. New accounts are created as `USER`.
- Added `username` to `User` with a unique Prisma migration.
- Login now accepts username or email through `identifier`, while keeping email compatibility.
- Seed now creates/updates `admin123/admin123` with the `ADMIN` role and keeps the existing secondary admin account.
- Admin users dashboard now lists username, email, name, status, and roles.
- Admins with `admin.users.manage` can assign/revoke `USER`, `MANAGER`, and `ADMIN` roles.
- Backend prevents removing the final remaining `ADMIN` role.
- Role changes are recorded in audit logs.

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

- Added PostgreSQL-backed `BuildingProperty` catalog for Da Nang buildings/properties with Overture IDs, geometry, centroid, address/admin fields, management status, raw attributes, normalized search text, and future embedding storage.
- Added guarded Nest API endpoints for property search, detail, create, update, soft delete, and Overture building import/upsert.
- Added Next route proxies for `/api/properties`, `/api/properties/[id]`, and `/api/properties/import/overture`.
- Added real Overture GeoPackage import tooling with ward/district enrichment from cached Da Nang GADM ward boundaries.
- Added Vietnamese natural-language count answers for ward/district building questions, including no-accent matching such as `phường hòa khánh bắc thuộc liên chiểu`.
- Added Vietnamese density intent search for questions like `vùng nào ở hòa khánh bắc có số lượng nhà dày đặc nhất`; the API returns a text answer plus map-ready density regions, and the web map renders those regions as highlighted cells.
- Applied the migration and seeded `properties.view`, `properties.manage`, and `properties.import`.

## Partially Implemented / Foundation Only

- `EP02-029` - Permission key exists for API key management, but API key CRUD is still pending.
- `EP02-082` - Shared log permission exists, but dedicated API log ingestion/listing is still pending.
- `EP02-099` - Audit log endpoint exists, but admin UI and richer system log workflows are still pending.
- Da Nang building/property import is still partial on the current Neon database. Full ward-clipped dry-run found `424,486` importable buildings from `621,175` raw Overture rows, but the full import stopped at Neon project size limit `512 MB`.
- Current database state is `235,250` `source='overture'` rows: `235,000` rows from staged upsert progress plus the earlier `250` initial rows. This is not a clean administrative subset because it follows GPKG stream order; do not treat it as done.
- The direct PostgreSQL importer now supports `--dry-run`, advisory locking, staging/upsert resume, storage preflight, `--district`, and `--ward` filters. The current full staging table has `424,486` rows and should be dropped/truncated before a smaller replacement import on the 512 MB Neon project.
- Recommended 512 MB subset: reset Overture rows and import `Liên Chiểu`, `Cẩm Lệ`, `Hải Châu`, and `Thanh Khê` only. This is `193,991` buildings, includes the Nguyễn Lương Bằng / Hòa Khánh search area, and has safer headroom than the current accidental `235,250` row partial import.
- Da Nang building/property search is PostgreSQL normalized lexical search today. Elasticsearch fuzzy search and `paraphrase-multilingual-MiniLM-L12-v2` semantic embeddings are prepared by schema/API seams but are not wired to a running embedding/indexing service yet.

## Recommended Next Backlog Slices

Detailed handoff for the search infrastructure slice: [next-session-semantic-search.md](./next-session-semantic-search.md).

1. Finish the database import decision: either upgrade Neon for all `424,486` buildings, or reset/reload the recommended `193,991` row district subset (`Liên Chiểu`, `Cẩm Lệ`, `Hải Châu`, `Thanh Khê`) on the current `512 MB` project.
2. `EP01-052` to `EP01-068` - Search: address keyword search, coordinate search, asset code/name search, suggestions, result highlight, recent history, source filters, no-accent search.
3. `EP01-069` to `EP01-085` - Filters: type/status/district/date filters, combined filters, saved templates, map/table sync, result counts.
4. `EP01-103` to `EP01-118` - Measurement: distance/area drawing, units, editable points, clear/copy/export, session persistence, RBAC gate `measurement.use`.
5. `EP01-119` to `EP01-135` - Export and sharing: PNG/PDF export, title/unit/time, legend/scale, paper setup, expiring share URL, watermark, preview.
6. `EP02-001` to `EP02-017` - Admin system configuration catalog: CRUD, search/filter/sort, soft delete, unique checks, import/export, audit history.
7. `EP02-018` to `EP02-034` - Admin API key catalog: CRUD, status, uniqueness, import/export, bulk operations, audit history.
