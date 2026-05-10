# GeoAI Web — SQLite Migration + Feature Completion Plan

## Background

The project is a GIS asset management platform (Next.js 16 web + NestJS API + Prisma ORM) for Da Nang city buildings/properties. Current state:

- **Database**: Neon PostgreSQL free tier — limited to 512MB, only fits ~63k rows (Liên Chiểu district). Full Da Nang dataset = **424,486** ward-clipped Overture rows.
- **Many features are "foundation only"** — permission keys seeded, endpoints scaffolded, but real CRUD/UI not built.
- **Search UX** is partially done — density/count questions work, but normal result list, coordinate search, suggestions, history are pending.

## Current Feature Assessment

### ✅ Well Implemented (Production-ready)

| Area                                       | EP Codes                        | Notes                                                   |
| ------------------------------------------ | ------------------------------- | ------------------------------------------------------- |
| Map basemap                                | EP01-001→006, 008, 010→011, 014 | Solid Leaflet integration, basemap memory, scale/cursor |
| Data layer management                      | EP01-018→024, EP01-026→034      | Layer visibility, ordering, opacity, config, history    |
| Asset display                              | EP01-035→042, EP01-044→051      | Viewport loading, clustering, popups, permissions       |
| Search UX + Vietnamese search foundation   | EP01-052→068, EP04-001→016      | Search list/table, suggestions, focus, NL count/density |
| Advanced filters                           | EP01-069→085                    | Type/status/ward/date filters, presets, history, export |
| Measurement tools                          | EP01-103→118                    | Distance/area drawing, snapping, labels, history/export |
| Asset CRUD/list/detail                     | EP03-001→017                    | Create/edit/delete, list filters, detail, audit trail   |
| Dashboard                                  | EP03-069→085                    | KPI summary, buckets, trend, filters, export            |
| Auth + Registration                        | —                               | Login, register, JWT, refresh sessions                  |
| RBAC seed + permission checks              | EP02-046, EP02-063, EP02-134    | Roles, permissions, guards, default role permissions    |
| Audit log viewing                          | EP02-099                        | Admin audit log endpoint and UI exist                   |
| Da Nang import pipeline / Overture tooling | —                               | Overture import scripts and API import path             |
| ES/MiniLM search infrastructure            | —                               | Provider pattern, fallback, embedding service support   |

### ⚠️ Foundation Only (Need completion)

| Area                                  | EP Codes                                | Gap                                                                                                                                          |
| ------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Export & sharing                      | EP01-119→135                            | Implementation exists, but current test suite is red because the share-route test fixture expired on 2026-05-10.                             |
| Admin user/role/permission management | Partial EP02-035→068, 120→123, 127, 136 | List/status/role assignment/matrix exist; full catalog CRUD/import/export/bulk/history remains incomplete.                                   |
| API key management                    | EP02-018→034                            | Permission exists, but no Prisma model, API CRUD, or UI.                                                                                     |
| API/system logs                       | EP02-069→102                            | Audit log exists, but dedicated API log ingestion/model/UI is missing.                                                                       |
| Asset dossier/profile                 | EP03-018→034                            | Basic detail page exists; documents/images/inspections/maintenance/supplier links/package download are missing.                              |
| Asset import/export pipeline          | EP03-052→068                            | Overture JSON import and filtered exports exist in parts; CSV/Excel/Shapefile preview, validation, templates, retries, and logs are missing. |

### ❌ Not Started

| Area                   | EP Codes     | Notes                 |
| ---------------------- | ------------ | --------------------- |
| Draw/edit spatial      | EP01-086→102 | Geometry editing      |
| Maintenance scheduling | EP03-035→051 | Periodic maintenance  |
| Backup/restore         | EP02-103→119 | Data backup           |
| SQL review/editing     | EP04-017→032 | Generated SQL display |
| Predictive maintenance | EP04-033→048 | AI risk scoring       |
| Image recognition      | EP04-049→064 | AI damage detection   |
| AI report generation   | EP04-065→080 | Auto report           |
| Heatmap analytics      | EP05-001→016 | Density heatmap       |
| Buffer analysis        | EP05-017→032 | Spatial buffer        |
| Route optimization     | EP05-033→048 | Maintenance routing   |
| Choropleth stats       | EP05-049→064 | Admin boundary stats  |

### Evidence Notes

- `apps/api/prisma/schema.prisma` only contains users, roles, permissions, sessions, audit logs, layer config, asset display config, and building properties; there are no API key, API log, maintenance, backup, dossier document, or analytics persistence models.
- `npm test -- --runInBand` currently fails one web test: `apps/web/app/share/map/route.test.js` treats a payload expiring on `2026-05-10` as valid, but the current date is `2026-05-10`, so the route redirects with `shareError=expired`.
- Export & sharing stays in Foundation Only until the stale share-route test fixture is updated and the relevant tests are green.

---

## Next 5 Priority Phases

### Phase 10 - Asset Dossier/Profile (`EP03-018 -> EP03-034`)

**Big task**: turn the current basic asset detail page into an operational dossier.

- `TASK-1001` Dossier tabs: add Overview, Documents, Inspections, Maintenance, Timeline, Links tabs to the asset detail page for `EP03-018 -> EP03-025`, `EP03-028`.
- `TASK-1002` Status/value panel: add editable current status and value history placeholder/table for `EP03-021 -> EP03-022`.
- `TASK-1003` Document list UI: add Upload button, document type filter, file list, and delete/download buttons backed by local/server-compatible placeholders for `EP03-020`, `EP03-023`.
- `TASK-1004` Inspection form: add Add Inspection button, date/result/notes fields, attachment placeholder, and inspection list for `EP03-024`.
- `TASK-1005` Timeline builder: combine asset updates, inspections, maintenance entries, incidents, and replacements into one timeline for `EP03-019`, `EP03-025`.
- `TASK-1006` Dossier search/export: add keyword search within dossier sections and Export/Download Package buttons for `EP03-026 -> EP03-027`, `EP03-032`.
- `TASK-1007` Dossier safety: add missing-document warnings, last-used config, local operation history, permission gates, and visible error states for `EP03-029 -> EP03-034`.

### Phase 11 - Asset Import/Export Pipeline (`EP03-052 -> EP03-068`)

**Big task**: make admin import/export usable beyond the current Overture path.

- `TASK-1101` Import page shell: add `/admin/import-export` page with Import CSV, Import Excel, Import Shapefile, Download Template, and Export buttons for `EP03-052 -> EP03-054`, `EP03-061`.
- `TASK-1102` CSV/Excel parser helpers: parse rows, normalize headers, validate required fields, and detect duplicate codes before upload for `EP03-052 -> EP03-053`, `EP03-056`.
- `TASK-1103` Preview/mapping table: show first rows, column mapping controls, validation badges, Confirm Import and Cancel buttons for `EP03-055`.
- `TASK-1104` Shapefile/GeoJSON path: accept spatial file inputs, normalize geometry, and show unsupported-file errors for `EP03-054`.
- `TASK-1105` Export buttons: export current asset filters to CSV, Excel-compatible CSV, GeoJSON, and Shapefile-compatible package placeholder for `EP03-057 -> EP03-060`.
- `TASK-1106` Retry and logs: add failed-row retry flow, import/export log list, last-used config, local history, permission gates, and visible errors for `EP03-062 -> EP03-068`.

### Phase 12 - Maintenance Scheduling (`EP03-035 -> EP03-051`)

**Big task**: add a v1 maintenance planning and work completion workflow.

- `TASK-1201` Maintenance data model/API: add recurring plan, assignment, due date, status, cost, result, and attachment fields/endpoints for `EP03-035 -> EP03-036`, `EP03-039 -> EP03-042`, `EP03-045`.
- `TASK-1202` Plan form: add Create Plan button, asset picker, cycle selector, due date, assignee, and validation messages for `EP03-035 -> EP03-036`, `EP03-042`.
- `TASK-1203` Calendar/list views: add Day/Week/Month switch and due/overdue list for `EP03-037 -> EP03-038`, `EP03-043`.
- `TASK-1204` Completion workflow: add Record Result button, Complete/Postpone/Cancel buttons, notes, cost, image/minutes attachment placeholders for `EP03-039 -> EP03-041`.
- `TASK-1205` Recurrence/notifications: auto-create next schedule after completion and add email/SMS notification boundary stubs for `EP03-044`, `EP03-046`.
- `TASK-1206` Maintenance audit/export: add cost stats, last-used config, local history, export, permission gates, and visible error states for `EP03-045`, `EP03-047 -> EP03-051`.

### Phase 13 - Heatmap Density Analytics (`EP05-001 -> EP05-016`)

**Big task**: add density heatmap analytics for assets.

- `TASK-1301` Heatmap API/helper: aggregate asset coordinates by current filters and bounds, return count, points, bbox, and low-data warning for `EP05-001 -> EP05-005`, `EP05-011`.
- `TASK-1302` Heatmap toolbar: add Enable Heatmap button, asset type/status/time filters, radius slider, intensity slider, and Clear button for `EP05-001 -> EP05-004`.
- `TASK-1303` Map rendering: add Leaflet heat layer or small compatible dependency, render heat points, and overlay with admin boundaries for `EP05-001`, `EP05-003`, `EP05-010`.
- `TASK-1304` Templates/history: add Save Template, Load Template, last-used config, and local operation history for `EP05-006`, `EP05-012 -> EP05-013`.
- `TASK-1305` Hotspot drilldown/comparison: click hotspot to open matching asset list and add two-period comparison controls for `EP05-008 -> EP05-009`.
- `TASK-1306` Heatmap export/security: export image/PDF/data, gate by permission, and show controlled error states for `EP05-007`, `EP05-014 -> EP05-016`.

---

## Principles Applied

- **DRY**: Reuse one normalized filter model across map search, asset list, dashboard, export payloads, presets, and share-ready URL params; reuse one measurement model across map overlays, toolbar summaries, local history, copy text, and JSON/GeoJSON export payloads; reuse one export-state model across PNG, printable PDF, share URLs, templates, and history.
- **SOLID**: Keep filter parsing/serialization separate from UI components; keep API date filtering inside `PropertiesService.searchWhere()`; keep dashboard aggregation inside `DashboardService`; keep measurement math/state in `apps/web/src/features/measurement/`; keep export/share serialization and capture helpers in `apps/web/src/features/export/` while page-level components orchestrate permission-gated workflows.
- **TDD**: Add failing API/helper/component tests before Phase 5 implementation; add failing measurement helper/state/toolbar/MapWrapper tests before Phase 6 implementation; add failing export/share helper/dialog/route/MapWrapper tests before Phase 7 implementation; add failing dashboard API/helper/component/BFF tests before Phase 8 implementation; verify the same focused targets after each fix.
- **YAGNI**: Store filter presets/history, measurement sessions/history, export templates/history, and dashboard filters/history in localStorage for v1; avoid database-backed preset/session/share/dashboard models, server-side snapping, chart dependencies, and a dedicated PDF dependency until multi-device sharing, cadastral-grade measurement, or higher-fidelity reporting is required.
