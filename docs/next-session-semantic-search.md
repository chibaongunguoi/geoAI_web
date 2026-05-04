# Next Session: Search + Vietnamese AI Query Slice

Source backlog file: `E:\codex_tasks_simple.txt`

This handoff is based on these backlog groups:

- `EP01-052` to `EP01-068`: address/location/asset search.
- `EP04-001` to `EP04-016`: Vietnamese natural-language AI query.
- Later follow-up: `EP04-017` to `EP04-032` for generated SQL review/editing.
- Later follow-up: `EP01-069` to `EP01-085` for advanced filters.

## Capability

Users should be able to search Da Nang buildings/properties from one map-side search surface using Vietnamese text, no-accent text, coordinates, asset/property code, name, address, ward, and district. Results must appear as both text/table results and map highlights. The current PostgreSQL search should remain the fallback, while the next infrastructure step prepares Elasticsearch/OpenSearch fuzzy search and MiniLM semantic retrieval.

Example queries:

- `Nguyen Luong Bang Hoa Khanh Bac`
- `Cho toi danh sach cac can nha o duong Nguyen Luong Bang tai phuong Hoa Khanh Bac`
- `Cho toi biet so cac toa nha cua phuong Hoa Khanh Bac thuoc Lien Chieu la bao nhieu`
- `Vung nao o Hoa Khanh Bac co so luong nha day dac nhat`
- `16.071, 108.150`
- `DN-OVT-...`

## Current State

- PostgreSQL table: `BuildingProperty`.
- Current DB rows: `235,250` `source='overture'` rows.
- Full dry-run importable Overture rows: `424,486`.
- Neon project limit blocked full import at `512 MB`.
- Current API supports:
  - property CRUD
  - PostgreSQL normalized no-accent search
  - lightweight fuzzy ranking
  - Vietnamese count questions
  - Vietnamese density questions
  - map-ready density regions
- Current web supports:
  - map sidebar property search panel
  - text answer display
  - density cell map rendering
- Not implemented yet:
  - address keyword UX polish
  - coordinate search
  - code/name dedicated search modes
  - suggestions while typing
  - result list selection and map focus
  - result highlight lifecycle
  - recent search history
  - source filters
  - clear no-result/error states
  - export of search results
  - real Elasticsearch/OpenSearch index
  - MiniLM embedding generation and vector retrieval

## Backlog Mapping

### EP01 Search Slice

- `EP01-052`: keyword address search.
- `EP01-053`: coordinate search and map movement.
- `EP01-054`: asset/property code search.
- `EP01-055`: asset/property name search.
- `EP01-056`: search suggestions while typing.
- `EP01-057`: auto zoom/focus to selected result.
- `EP01-058`: highlight selected results on map.
- `EP01-059`: list multiple matching results.
- `EP01-060`: recent search history.
- `EP01-061`: filter search source by address/property.
- `EP01-062`: no-accent search.
- `EP01-063`: clear no-result and error messages.
- `EP01-064`: persist last search configuration.
- `EP01-065`: audit/history for search operations.
- `EP01-066`: export search results.
- `EP01-067`: role-based access for search.
- `EP01-068`: alert when search fails.

### EP04 Natural-Language Query Slice

- `EP04-001`: Vietnamese natural-language asset/property questions.
- `EP04-002`: show query results on map.
- `EP04-003`: show query results in table/list.
- `EP04-004`: sample Vietnamese questions.
- `EP04-005`: support accented and no-accent questions.
- `EP04-006`: parse conditions such as type, status, district/ward, and time.
- `EP04-007`: recent question history.
- `EP04-008`: favorite questions.
- `EP04-009`: ambiguous-question warning and rewrite suggestions.
- `EP04-010`: restrict AI query scope by existing permissions.
- `EP04-011`: export AI query results to Excel.
- `EP04-012`: persist last natural-language query config.
- `EP04-013`: audit/history for natural-language query actions.
- `EP04-014`: export natural-language query result data.
- `EP04-015`: role-based access for natural-language query.
- `EP04-016`: alert when natural-language query fails.

## Recommended One-Session Scope

Do this next session first, before full Elasticsearch/MiniLM infrastructure:

1. Build the unified search result contract and UI behavior for `EP01-052` to `EP01-063`.
2. Add recent search/query history foundation for `EP01-060` and `EP04-007`.
3. Add sample question presets for `EP04-004`.
4. Add permission/error behavior for `EP01-067`, `EP01-068`, `EP04-010`, `EP04-015`, and `EP04-016`.
5. Keep PostgreSQL as the active backend, but shape the provider interface so Elasticsearch/MiniLM can be added cleanly next.

Reason: the user-facing backlog stories require stable list/map/history/error behavior first. Elasticsearch/MiniLM can then replace or enhance the provider without rewriting the UI contract.

## Implementation Contract

### API

Keep `/properties` as the main query endpoint, but make its response contract stable:

```ts
type PropertySearchResponse = {
  items: BuildingPropertyRow[];
  answer?: {
    type: "count" | "density" | "list" | "coordinate";
    text: string;
    count?: number;
    filters?: Record<string, string>;
    topRegion?: unknown;
  };
  map?: {
    type: "property-results" | "property-density" | "coordinate";
    regions?: unknown[];
    points?: unknown[];
    focus?: { lat: number; lng: number; zoom?: number };
  };
  suggestions?: Array<{
    label: string;
    value: string;
    type: "address" | "property" | "coordinate" | "question";
  }>;
  meta: {
    limit: number;
    tokens: string[];
    normalizedQuery: string;
    searchMode: string;
    warnings?: string[];
  };
};
```

Add or prepare these service methods:

- `searchProperties`
- `suggestProperties`
- `recordSearchHistory`
- `listSearchHistory`
- `favoriteQuestion`
- `exportSearchResults`

### Web

Upgrade the map sidebar search panel:

- one input for keyword/NL question
- source selector: all/address/property/code/coordinate/AI question
- suggestions dropdown
- result list with selectable rows
- map highlight for selected row
- auto zoom/focus on selected result
- recent queries
- sample Vietnamese questions
- no-result and error state

### Data

For one-session scope, keep data storage light:

- Use localStorage first for recent search UI if backend history is too large for the session.
- Prefer adding backend history only if there is already a local audit/history pattern to reuse.
- Do not add embedding vectors to Neon.
- Do not expand the current Overture import until the DB size decision is made.

## Elasticsearch + MiniLM Infrastructure Lane

This is the following infrastructure slice after the search UX contract is stable.

### Services

- Add Elasticsearch or OpenSearch as a read/search projection.
- Add a Python embedding/indexing worker using:
  - `sentence-transformers`
  - `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- PostgreSQL remains the source of truth.

### Index

Create `building_properties_v1`.

Recommended fields:

- `id`
- `code`
- `overtureId`
- `name`
- `addressLine`
- `street`
- `ward`
- `district`
- `city`
- `propertyType`
- `status`
- `source`
- `centroidLat`
- `centroidLng`
- `bbox`
- `searchText`
- `searchTextNormalized`
- `embedding`
- `updatedAt`
- `deletedAt`

Recommended search behavior:

- fuzzy lexical query over address/name/street/search text
- kNN semantic query over MiniLM embedding
- score merge and dedupe by `BuildingProperty.id`
- hydrate final records from PostgreSQL
- fallback to PostgreSQL when ES or embedding service is unavailable

## TDD Test Plan

Write tests first.

API tests:

- keyword address search returns matching `BuildingProperty` rows.
- coordinate query returns a map focus object.
- property code query matches exact code.
- property name query matches no-accent text.
- suggestions return address/property/question suggestions.
- selected result payload has map point/region data.
- no-result query returns clear warning.
- Vietnamese NL query supports accented and no-accent text.
- density question still uses PostgreSQL aggregation.
- provider fallback returns PostgreSQL results when ES is disabled.

Web tests:

- search input renders with default sample question.
- submitting query calls `/api/properties`.
- result answer text is shown.
- result list rows are shown.
- density regions are passed to map.
- recent searches are saved and displayed.
- no-result/error state is visible.

Worker tests, only if ES/MiniLM is added in the session:

- embedding text payload is deterministic.
- deleted rows are skipped.
- bulk index document id equals `BuildingProperty.id`.
- retries do not duplicate documents.

Run:

```bash
npm run test -w @geoai/api -- properties.service.spec.ts
npm run test:web
npm run test:api
npm run build
```

If Python worker is added:

```bash
.venv310\Scripts\python.exe -m unittest discover scripts
```

## Proposed Files

Likely new files for the next session:

- `apps/web/src/features/map/property-search-panel.js`
- `apps/web/src/features/map/property-search-panel.test.js`
- `apps/web/src/features/map/property-search-history.js`
- `apps/web/src/features/map/property-search-history.test.js`
- `apps/api/src/properties/property-search-response.ts`
- `apps/api/src/properties/property-search-provider.ts`
- `apps/api/src/properties/postgres-property-search.provider.ts`

Likely later ES/MiniLM files:

- `apps/api/src/properties/elasticsearch-property-search.provider.ts`
- `apps/api/src/properties/hybrid-property-search.service.ts`
- `scripts/index_building_properties.py`
- `scripts/test_index_building_properties.py`
- `docker-compose.search.yml`

## Environment Variables For Later ES/MiniLM

Add only when implementation actually uses them:

```text
PROPERTY_SEARCH_PROVIDER=postgres|elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
PROPERTY_INDEX_NAME=building_properties_v1
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
EMBEDDING_BATCH_SIZE=128
```

## Non-Goals

- Do not finish the full Overture import in this search session.
- Do not store embeddings in the current Neon project.
- Do not remove PostgreSQL fallback.
- Do not implement editable generated SQL in this session; that belongs to `EP04-017` to `EP04-032`.
- Do not implement the whole advanced filter slice; that belongs to `EP01-069` to `EP01-085`.

## Open Questions

- Should recent/favorite search history be backend-persisted now, or localStorage first?
- Should property search use `search.use` only, or add a dedicated `properties.search` permission?
- Should Elasticsearch or OpenSearch be the chosen search engine?
- Is Docker acceptable for local search infrastructure?
- Should the current accidental `235,250` row partial import be reset before indexing?
- Should the DB import target be all `424,486` rows on a larger Neon plan or the `193,991` row district subset?

## Handoff

Recommended next session order:

1. Write API tests for `EP01-052` to `EP01-063` result contract.
2. Stabilize `/properties` response shape for list, count, density, coordinate, and no-result cases.
3. Add suggestion endpoint or suggestion mode for `EP01-056`.
4. Add web result list, selection, map focus, and highlight behavior for `EP01-057` to `EP01-059`.
5. Add recent query/sample question UI for `EP01-060`, `EP04-004`, and `EP04-007`.
6. Add no-result/error/permission behavior for `EP01-063`, `EP01-067`, `EP01-068`, `EP04-010`, `EP04-015`, and `EP04-016`.
7. Update `docs/backlog-progress.md` with completed EP IDs and remaining ES/MiniLM infrastructure status.

Ready for implementation with PostgreSQL provider first; Elasticsearch/MiniLM should be the next infrastructure lane after the search UI contract is stable.
