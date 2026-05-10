# Product Backlog Progress

Compact tracker for what is done, partially done, and still open. Source task IDs come from [codex_tasks_simple.txt](./codex_tasks_simple.txt). Phase order follows [plan.md](./plan.md).

## Progress By EP

### EP01 - Map, Layers, Search, Filters, Tools

- Done: `EP01-001 -> EP01-006`, `EP01-008`, `EP01-010 -> EP01-011`, `EP01-014`, `EP01-018 -> EP01-024`, `EP01-026 -> EP01-042`, `EP01-044 -> EP01-135`.
- Not done: `EP01-007`, `EP01-009`, `EP01-012 -> EP01-013`, `EP01-015 -> EP01-017`, `EP01-025`, `EP01-043`.
- Next EP01 phase: none currently planned.

### EP02 - Admin, RBAC, Logs, Backup, Users

- Done/foundation: `EP02-029`, `EP02-046`, `EP02-063`, `EP02-082`, `EP02-099`, `EP02-120 -> EP02-123`, `EP02-127`, `EP02-134`, `EP02-136`.
- Partially done: admin users, roles, permissions, permission catalog, role-permission assignment, and audit-log viewing.
- Not done: API key CRUD `EP02-018 -> EP02-028`, `EP02-030 -> EP02-034`; full admin catalogs `EP02-001 -> EP02-017`, `EP02-035 -> EP02-068`; API/system logs `EP02-069 -> EP02-085`, `EP02-086 -> EP02-102`; backup/restore `EP02-103 -> EP02-119`; advanced user/security controls `EP02-124 -> EP02-126`, `EP02-128 -> EP02-133`, `EP02-135`.

### EP03 - Assets, Dossier, Maintenance, Import/Export, Dashboard

- Done: `EP03-001 -> EP03-034`, `EP03-052 -> EP03-068`, `EP03-069 -> EP03-085`.
- Partially server-backed: Phase 10 asset dossier/profile uses local dossier storage for documents, inspections, maintenance entries, value history, links, timeline extras, search/export, warnings, last-used config, and local history; current status updates use the existing property API.
- Partially server-backed: Phase 11 asset import/export uses a server-backed generic asset import endpoint for valid rows, full client-side CSV/Excel/GeoJSON/Shapefile parsing/export helpers, and local storage for import/export logs, history, and last-used config.
- Not done: `EP03-035 -> EP03-051`.
- Next EP03 phase: Phase 12 `EP03-035 -> EP03-051`.

### EP04 - Vietnamese NL Query And AI Features

- Done: `EP04-001 -> EP04-016`.
- Not done: SQL review/editing `EP04-017 -> EP04-032`; predictive maintenance `EP04-033 -> EP04-048`; image recognition `EP04-049 -> EP04-064`; AI report generation `EP04-065 -> EP04-080`.

### EP05 - Spatial Analytics

- Done: none.
- Not done: heatmap `EP05-001 -> EP05-016`; buffer analysis `EP05-017 -> EP05-032`; route optimization `EP05-033 -> EP05-048`; choropleth/admin stats `EP05-049 -> EP05-064`.
- Next EP05 phase: Phase 13, `EP05-001 -> EP05-016`.
