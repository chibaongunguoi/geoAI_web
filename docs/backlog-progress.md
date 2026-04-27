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

## Partially Implemented / Foundation Only

- `EP01-028` - Added a static GeoJSON-backed sample asset layer from `/data/sample-assets.geojson`. WMS/WMTS loading and configurable external layer sources are not implemented yet.
- `EP02-029` - Permission key exists for API key management, but API key CRUD is still pending.
- `EP02-082` - Shared log permission exists, but dedicated API log ingestion/listing is still pending.
- `EP02-099` - Audit log endpoint exists, but admin UI and richer system log workflows are still pending.

## Recommended Next Backlog Slices

1. `EP01-029` to `EP01-034` - Finish layer operations: refresh layer, load error display, last-used layer config, operation history, export layer result/config, and RBAC checks for layer tools.
2. `EP01-035` to `EP01-052` - Asset display: markers, popup summary, detail link, status icon, clustering, labels, role-based popup fields, viewport-based loading.
3. `EP01-052` to `EP01-068` - Search: coordinate search, asset code/name search, suggestions, result highlight, recent history, source filters, no-accent search.
4. `EP01-069` to `EP01-085` - Filters: type/status/district/date filters, combined filters, saved templates, map/table sync, result counts.
5. `EP01-103` to `EP01-118` - Measurement: distance/area drawing, units, editable points, clear/copy/export, session persistence, RBAC gate `measurement.use`.
6. `EP01-119` to `EP01-135` - Export and sharing: PNG/PDF export, title/unit/time, legend/scale, paper setup, expiring share URL, watermark, preview.
7. `EP02-001` to `EP02-017` - Admin system configuration catalog: CRUD, search/filter/sort, soft delete, unique checks, import/export, audit history.
8. `EP02-018` to `EP02-034` - Admin API key catalog: CRUD, status, uniqueness, import/export, bulk operations, audit history.
