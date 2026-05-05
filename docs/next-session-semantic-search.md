# Next Session: Search UX + Vietnamese AI Query

Source backlog file: `E:\codex_tasks_simple.txt`

This file is the forward plan. Completed work is recorded in [backlog-progress.md](./backlog-progress.md).

## Current State

### Implemented

- PostgreSQL table: `BuildingProperty`.
- Current DB rows: `235,250` `source='overture'` rows.
- Full ward-clipped dry-run importable Overture rows: `424,486`.
- Neon project limit blocked full import at `512 MB`.
- `/api/properties` supports:
  - guarded property search/detail/create/update/soft-delete/import endpoints
  - PostgreSQL normalized no-accent search
  - lightweight fuzzy ranking
  - Vietnamese count questions
  - Vietnamese density questions
  - map-ready density regions
  - stable `items`, `answer`, `map`, and `meta` response shape
- Web map supports:
  - map sidebar property search panel
  - answer text for property queries
  - density-region rendering
  - top density bbox rendering
  - scan-style building boxes for the densest region
  - auto-zoom/focus for density questions such as `vùng nào ở hòa khánh bắc có số lượng nhà dày đặc nhất`
- Optional Elasticsearch/MiniLM infrastructure is implemented:
  - Elasticsearch 8.x, not OpenSearch
  - index name: `building_properties_v1`
  - `dense_vector` embedding with `dims: 384`, `index: true`, `similarity: cosine`
  - `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
  - PostgreSQL hydration and fallback
  - embeddings live only in Elasticsearch, not Neon/PostgreSQL

### Still Pending

- Result list/table for normal property search.
- Selecting one result and focusing/highlighting it on the map.
- Coordinate search.
- Dedicated code/name/address/source search modes.
- Suggestions while typing.
- Recent search and recent natural-language question history.
- Favorite/sample question UX beyond the current default text.
- Source filters.
- Clear no-result and error states.
- Search result export.
- Advanced filters.
- Full import decision for the Overture dataset.

## Codex Task Mapping

### Search: `EP01-052` to `EP01-068`

- `EP01-052` - Keyword address search: backend partially available; UX polish still needed.
- `EP01-053` - Coordinate search and map movement: pending.
- `EP01-054` - Asset/property code search: property search partly available; dedicated mode pending.
- `EP01-055` - Asset/property name search: property search partly available; dedicated mode pending.
- `EP01-056` - Suggestions while typing: pending.
- `EP01-057` - Auto zoom/focus: done for density question; pending for selected normal results.
- `EP01-058` - Highlight results on map: done for density question; pending for selected normal results.
- `EP01-059` - List multiple matching results: pending in web UI.
- `EP01-060` - Recent search history: pending.
- `EP01-061` - Source filter by address/property: pending.
- `EP01-062` - No-accent search: backend partially done.
- `EP01-063` - Clear no-result/error messages: pending polish.
- `EP01-064` - Persist last search configuration: pending.
- `EP01-065` - Search operation history/audit: pending.
- `EP01-066` - Export search results: pending.
- `EP01-067` - Role-based search access: existing permission path is in place; dedicated UX/access behavior pending.
- `EP01-068` - Alert when search fails: pending polish.

### Vietnamese Natural-Language Query: `EP04-001` to `EP04-016`

- `EP04-001` - Vietnamese natural-language asset/property questions: partially done for property count/density.
- `EP04-002` - Show query results on map: done for density; pending for general list results.
- `EP04-003` - Show query results in table/list: pending.
- `EP04-004` - Sample Vietnamese questions: pending proper UI.
- `EP04-005` - Accented and no-accent questions: partially done.
- `EP04-006` - Parse conditions such as type/status/district/ward/time: partially done for ward/district; type/status/time pending.
- `EP04-007` - Recent question history: pending.
- `EP04-008` - Favorite questions: pending.
- `EP04-009` - Ambiguous-question warning and rewrite suggestions: pending.
- `EP04-010` - Restrict AI query scope by permissions: pending explicit verification.
- `EP04-011` - Export AI query results to Excel: pending.
- `EP04-012` - Persist last natural-language query config: pending.
- `EP04-013` - Audit/history for natural-language query actions: pending.
- `EP04-014` - Export natural-language query result data: pending.
- `EP04-015` - Role-based access for natural-language query: pending explicit verification.
- `EP04-016` - Alert when natural-language query fails: pending polish.

### Later Slices

- `EP01-069` to `EP01-085` - Advanced filters: type, status, district/ward, date, combined filters, saved templates, map/table sync, counts, export, permissions, error alerts.
- `EP01-103` to `EP01-118` - Measurement tools: distance, area, units, editable points, clear/copy/export, session persistence, permissions, error alerts.
- `EP01-119` to `EP01-135` - Export and sharing: PNG/PDF, title/unit/time, legend/scale, paper setup, expiring share URL, watermark, preview.
- `EP04-017` to `EP04-032` - Generated SQL review/editing. Do not start this until the search/query UX contract is stable.

## Recommended Next Session Scope

Do these in order.

1. Build the normal property search result list for `EP01-052`, `EP01-054`, `EP01-055`, and `EP01-059`.
   - Show rows from `/api/properties`.
   - Include code/name/address/ward/district/status where available.
   - Keep density answers in the existing answer panel.

2. Add selected-result map focus for `EP01-057` and `EP01-058`.
   - Clicking a result should zoom to its centroid or bbox.
   - Draw a visible selected-result bbox/marker.
   - Keep the density bbox behavior that already works.

3. Add coordinate search for `EP01-053`.
   - Accept `lat,lng` and `lng,lat` safely.
   - Return `map.focus`.
   - Move the map to the point and display a marker.

4. Add suggestions and source mode for `EP01-056` and `EP01-061`.
   - Start with simple suggestions from recent searches and returned items.
   - Add source modes: all, address, property/code, coordinate, natural-language question.
   - Do not break the existing one-input workflow.

5. Add history/persistence foundation for `EP01-060`, `EP01-064`, `EP04-007`, and `EP04-012`.
   - Start with localStorage if backend audit/history is too large for one session.
   - Reuse the existing audit/history pattern only if it stays small.

6. Add clear user feedback for `EP01-063`, `EP01-068`, and `EP04-016`.
   - Empty result state.
   - Backend unavailable state.
   - Elasticsearch fallback warning state from `meta.warnings`.

7. Extend Vietnamese natural-language behavior for `EP04-004`, `EP04-006`, and `EP04-009`.
   - Add sample question buttons.
   - Add condition parsing for status/type only if the data is reliable.
   - Add an ambiguity warning for unclear ward/district or too-broad questions.

8. Defer export/favorites until after list/focus/history are stable.
   - `EP01-066`, `EP04-008`, `EP04-011`, `EP04-014`.

## Elasticsearch + MiniLM Operations

Use this to verify the semantic search projection. PostgreSQL remains source of truth.

Start Elasticsearch:

```bash
docker compose -f docker-compose.search.yml up -d
```

Start the MiniLM embedding service:

```bash
.venv310\Scripts\python.exe scripts\property_embedding_service.py
```

Index active `BuildingProperty` rows:

```bash
.venv310\Scripts\python.exe scripts\index_building_properties.py
```

Set these in the API runtime when using Elasticsearch:

```text
PROPERTY_SEARCH_PROVIDER=elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
PROPERTY_INDEX_NAME=building_properties_v1
EMBEDDING_SERVICE_URL=http://localhost:5055
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
EMBEDDING_BATCH_SIZE=128
```

Verify:

```bash
npm run dev:api
npm run dev:web
```

Then query:

```text
/api/properties?query=Nguyen%20Luong%20Bang%20Hoa%20Khanh%20Bac&limit=10
```

Expected:

- With ES running: `meta.searchMode` should indicate Elasticsearch/MiniLM hybrid search.
- With ES or the embedding service stopped: results should fall back to PostgreSQL and include `meta.warnings`.
- Count and density questions should continue to use PostgreSQL aggregation.

## Import Decision To Carry Forward

The current Neon project is limited to `512 MB`.

Known data points:

- Raw Overture rows in the source GeoPackage: `621,175`.
- Full ward-clipped importable buildings: `424,486`.
- Current partial DB state: `235,250` Overture rows.
- The current partial import follows stream order and is not a clean administrative subset.
- The full staging table has `424,486` rows and should be dropped/truncated before any replacement import.

Recommended decision for the next data session:

- Either upgrade Neon and import all `424,486` ward-clipped rows.
- Or reset Overture rows and import a smaller planned subset on the current `512 MB` project.

Candidate smaller subset:

- `Liên Chiểu`
- `Cẩm Lệ`
- `Hải Châu`
- `Thanh Khê`

This subset is about `193,991` buildings, includes the Nguyễn Lương Bằng / Hòa Khánh search area, and has safer headroom than the accidental `235,250` row partial import.

Do not make this import change inside the search UX session unless the user explicitly asks for data reset/import work.

## Suggested Test Plan

API tests:

- Keyword address search returns matching `BuildingProperty` rows.
- Coordinate query returns `map.focus`.
- Property code query matches exact code.
- Property name query matches no-accent text.
- Suggestions return address/property/question suggestions.
- Selected-result payload has map point/bbox data.
- No-result query returns a clear warning/state.
- Vietnamese NL query supports accented and no-accent text.
- Density question still uses PostgreSQL aggregation and returns top bbox.
- ES fallback returns PostgreSQL results when ES is disabled or embedding fails.

Web tests:

- Search input renders with the default Vietnamese question.
- Submitting a query calls `/api/properties`.
- Answer text is shown.
- Result list rows are shown.
- Clicking a result focuses/highlights it on the map.
- Density result draws the top bbox and building boxes.
- Recent searches are saved and displayed.
- No-result/error state is visible.

Python/script tests:

- Embedding text payload is deterministic.
- Deleted rows are skipped.
- Bulk index document id equals `BuildingProperty.id`.
- Repeated indexing does not duplicate documents.

Run:

```bash
npm run test -w @geoai/api -- properties.service.spec.ts
npm run test:web
npm run test:api
npm run build
.venv310\Scripts\python.exe -m unittest discover scripts
```

## Non-Goals For The Next Search UX Session

- Do not store embeddings in Neon/PostgreSQL.
- Do not remove PostgreSQL fallback.
- Do not switch from Elasticsearch to OpenSearch.
- Do not expand/reset the Overture import unless the user explicitly asks for the data session.
- Do not implement generated SQL editing yet.
- Do not implement the full advanced filter slice until search list/focus/history are stable.

## Handoff Summary

The next best product slice is `EP01-052` to `EP01-068` plus the user-facing parts of `EP04-001` to `EP04-016`: result list, selected-result focus, coordinate search, suggestions, history, source modes, and clear error/fallback states. ES/MiniLM is ready for operational verification, but the biggest user-visible gap is now search UX around normal list results, not the density bbox path.
