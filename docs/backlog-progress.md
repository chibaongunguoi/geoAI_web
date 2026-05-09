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
