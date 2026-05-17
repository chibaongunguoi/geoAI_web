# Semantic Search Stabilization Bugfix Design

## Overview

This design consolidates fixes for multiple bugs in the semantic search flow for properties in the GeoAI Web application. The bugs share a common trigger point: the property search form in `apps/web/components/MapWrapper.js` calling `fetch("/api/properties?query=...")` → Next route `apps/web/app/api/properties/route.js` → Nest controller `apps/api/src/properties/properties.controller.ts` → `properties.service.ts::searchProperties()`.

The primary issues are:
1. **Intent Recognition Gaps**: Density queries with synonyms ("thưa thớt nhất", "ít nhất", "cao nhất") not recognized, falling back to `list` intent
2. **Incomplete Hydration**: Only first density region gets `objects[]` populated, other regions empty
3. **Performance Bottleneck**: LIKE scans on 4GB SQLite table causing 10-60s delays instead of using exact ward/district matching with indexes
4. **Heavy Payloads**: Full `geometry`, `attributes`, `embedding` fields loaded unnecessarily
5. **Infinite Hangs**: No timeouts on MiniLM/Elasticsearch calls, causing indefinite blocking
6. **Ward Matching Failures**: No ward whitelist, causing misidentification of wards as districts
7. **Request Racing**: Frontend doesn't abort old requests when user types rapidly
8. **Stop Word Conflicts**: Same `STOP_WORDS` set used for both tokenization and intent classification, removing density keywords
9. **Worst-Case Hangs**: Density queries without ward/district attempt full table scans

The fix strategy uses the bug condition methodology with targeted changes to intent classification, query optimization, projection control, timeout enforcement, and request lifecycle management.

## Glossary

- **Bug_Condition (C)**: Predicate identifying inputs that trigger defects. Fix checks run on `C(X) = true`; preservation checks run on `NOT C(X)`.
- **Property (P)**: Desired behavior for buggy inputs after fix is applied.
- **Preservation**: Existing correct behavior for `NOT C(X)` that must remain unchanged by the fix.
- **F**: Original (unfixed) function before changes.
- **F'**: Fixed function after changes are applied.
- **Light Projection**: Prisma `select` shape that omits `geometry`, `attributes`, `embedding` by default while keeping `bbox`, `centroidLat`, `centroidLng` for map rendering.
- **AbortController**: Web API standard for canceling `fetch` requests. Used both backend (via `AbortSignal.timeout(ms)`) and frontend (canceling old requests).
- **MiniLM**: Python service at `http://localhost:5055/embed` running `paraphrase-multilingual-MiniLM-L12-v2`, outputting 384-dim vectors for semantic search.
- **Elasticsearch script_score**: Hybrid search combining BM25 on `searchTextNormalized` with `cosineSimilarity(query_vector, 'embedding')`.
- **Density Region**: A region (cell or ward/district) in response `map.regions[]` with `count`, `center`, `bbox`, and `objects[]` array of buildings.
- **Ward Whitelist (KNOWN_WARDS)**: Set of canonical ward names built once from `locationNames()` cache (reading from SQLite `BuildingProperty.ward DISTINCT`).
- **Density Direction**: Sort direction for density queries. `"highest"` for "nhiều nhất / dày đặc nhất", `"lowest"` for "ít nhất / thưa thớt nhất".
- **Total UI Deadline**: Maximum time from form submit to user seeing response or clear error message.
- **searchIntent()**: Function in `properties.service.ts` that classifies query into intent types (`list`, `count`, `density`) and extracts filters.
- **isDensityQuestion()**: Helper function determining if normalized query contains density intent keywords.
- **densityDirection()**: Helper function determining sort direction (`"highest"` or `"lowest"`) from density query.
- **densityRegions()**: Function querying SQLite for density aggregation by ward/district.
- **attachDensityObjects()**: Function hydrating `objects[]` arrays for density regions.
- **selectLightPropertyFields()**: Helper returning Prisma `select` shape excluding heavy fields.
- **locationNames()**: Lazy-cached function returning distinct wards and districts from database.
- **normalizeSearchText()**: Function removing diacritics and lowercasing Vietnamese text.
- **STOP_WORDS_FOR_TOKENS**: Set of filler words to remove from search tokens.
- **INTENT_KEYWORDS**: Set of keywords that must be preserved for intent classification.


## Bug Details

### Bug Condition C-SS-1: Expanded Density Intent Recognition

The bug manifests when a user submits a natural language Vietnamese query containing density intent keywords NOT in the current set (`day dac`, `mat do`, `dong nhat`, `nhieu nhat`) — specifically: `thua thot`, `it nha`, `it nhat`, `vang`, `dong duc`, `nhieu nha nhat`, `cao nhat`, `thap nhat` — AND the query contains property object indicators (`nha`, `toa nha`, `can nha`, `building`, `bat dong san`) AND region indicators (`vung`, `khu`, `noi`, `cho`). The `isDensityQuestion()` function returns `false` (incorrect), causing the intent to fall back to `list`.

**Formal Specification:**
```
FUNCTION isBugCondition_C_SS_1(input)
  INPUT: input of type QueryString
  OUTPUT: boolean
  
  normalized := normalizeSearchText(input.query)
  
  newDensityKeywords := {
    'thua thot', 'it nha', 'it nhat', 'vang nha', 'dong duc',
    'nhieu nha nhat', 'cao nhat', 'thap nhat'
  }
  
  hasNewDensityKeyword := EXISTS keyword IN newDensityKeywords WHERE normalized CONTAINS keyword
  hasPropertyIndicator := normalized CONTAINS_ANY_OF ['nha', 'toa nha', 'can nha', 'building', 'bat dong san']
  hasRegionIndicator := normalized CONTAINS_ANY_OF ['vung', 'khu', 'noi', 'cho']
  
  RETURN hasNewDensityKeyword AND hasPropertyIndicator AND hasRegionIndicator
         AND isDensityQuestion(normalized) = false
END FUNCTION
```

**Examples:**
- Query: "vùng nào thưa thớt nhất ở Liên Chiểu" → Expected: `intent.type = "density"`, `direction = "lowest"` | Actual: `intent.type = "list"`
- Query: "khu vực ít nhà ở Hòa Khánh Bắc" → Expected: `intent.type = "density"`, `direction = "lowest"` | Actual: `intent.type = "list"`
- Query: "mật độ cao nhất ở Hải Châu" → Expected: `intent.type = "density"`, `direction = "highest"` | Actual: `intent.type = "list"`
- Edge case: "vùng nào nhiều nhà nhất" (already works) → Expected: `intent.type = "density"`, `direction = "highest"`

### Bug Condition C-SS-2: Density Region Object Hydration

The bug manifests when a density response contains multiple regions (`map.regions.length > 1`). The `attachDensityObjects()` function only hydrates `objects[]` for `regions[0]`, leaving all other regions with empty or undefined `objects[]` arrays. Users clicking on non-first regions see empty panels.

**Formal Specification:**
```
FUNCTION isBugCondition_C_SS_2(input)
  INPUT: input of type DensityResponse
  OUTPUT: boolean
  
  RETURN input.intent.type = "density"
         AND input.map.regions.length > 1
         AND (FOR ALL i > 0: input.map.regions[i].objects IS EMPTY OR UNDEFINED)
END FUNCTION
```

**Examples:**
- Response with 3 regions: `regions[0].objects.length = 200`, `regions[1].objects.length = 0`, `regions[2].objects.length = 0` → Bug present
- Response with 1 region: `regions[0].objects.length = 350` → No bug (preservation case)
- Expected after fix: All regions have `objects[]` proportional to their `count` values, total ≤ 350

### Bug Condition C-SS-3: LIKE Scan Instead of Exact Match

The bug manifests when a density intent has `intent.filters.ward` or `intent.filters.district` successfully matched in `locationNames()` cache, but `densityRegions()` or `densityTotal()` still uses `LIKE '%term%'` on `searchTextNormalized` instead of exact equality `WHERE ward = ?` / `WHERE district = ?`. This causes full table scans on the 4GB SQLite database, resulting in 10-60 second delays.

**Formal Specification:**
```
FUNCTION isBugCondition_C_SS_3(input)
  INPUT: input of type DensityIntent
  OUTPUT: boolean
  
  cache := locationNames()
  hasMatchedWard := input.filters.ward IS NOT NULL AND cache.wards.has(input.filters.ward)
  hasMatchedDistrict := input.filters.district IS NOT NULL AND cache.districts.has(input.filters.district)
  
  sqlQuery := generateDensityRegionsSQL(input)
  usesLikeScan := sqlQuery CONTAINS "LIKE '%"
  
  RETURN (hasMatchedWard OR hasMatchedDistrict) AND usesLikeScan
END FUNCTION
```

**Examples:**
- Query: "vùng nào nhiều nhà nhất ở Hòa Khánh Bắc" with `filters.ward = "hoa khanh bac"` → SQL uses `LIKE '%hoa%' OR LIKE '%khanh%'` → 30s response time
- Expected: SQL uses `WHERE ward = 'hoa khanh bac'` with index → <1s response time
- Query without ward/district match → Falls back to timeout mechanism (Requirement 9)

### Bug Condition C-SS-4: Heavy Field Projection

The bug manifests when `prisma.buildingProperty.findMany` is called from `searchPropertiesPostgres` (for `list`/`count` intents) or `attachDensityObjects` (for `density` intent) WITHOUT an explicit `select` field specification. Prisma defaults to returning full rows including `geometry` (potentially MB per item), `attributes` (large object), and `embedding` (384 floats), causing slow responses and high bandwidth usage.

**Formal Specification:**
```
FUNCTION isBugCondition_C_SS_4(input)
  INPUT: input of type PrismaFindManyCall
  OUTPUT: boolean
  
  isSearchPath := input.caller IN ['searchPropertiesPostgres', 'attachDensityObjects']
  hasNoSelectClause := input.options.select IS UNDEFINED
  
  RETURN isSearchPath AND hasNoSelectClause
END FUNCTION
```

**Examples:**
- Call: `prisma.buildingProperty.findMany({ where: {...}, take: 10 })` from `searchPropertiesPostgres` → Returns full rows with `geometry`, `attributes`, `embedding`
- Expected: `prisma.buildingProperty.findMany({ where: {...}, take: 10, select: selectLightPropertyFields() })` → Returns only necessary fields
- Payload size: Current ~500KB for 10 items → Expected <100KB for 10 items

### Bug Condition C-SS-5: Backend Service Timeouts

The bug manifests when `ElasticsearchPropertySearchProvider` calls either (a) `this.fetchImpl(${url}/embed, ...)` in `embed()` to MiniLM service, or (b) `this.client.search(...)` in `searchHits()` to Elasticsearch, WITHOUT an `AbortSignal` or `requestTimeout`. If the external service hangs (no response), the Nest request blocks indefinitely.

**Formal Specification:**
```
FUNCTION isBugCondition_C_SS_5(input)
  INPUT: input of type ExternalServiceCall
  OUTPUT: boolean
  
  isMiniLMCall := input.target = "http://localhost:5055/embed"
  isElasticsearchCall := input.target = "elasticsearch.search"
  
  hasNoTimeout := input.options.signal IS UNDEFINED
                  AND input.options.requestTimeout IS UNDEFINED
  
  serviceHangs := input.responseTime > 10000  // ms
  
  RETURN (isMiniLMCall OR isElasticsearchCall) AND hasNoTimeout AND serviceHangs
END FUNCTION
```

**Examples:**
- MiniLM service frozen → `embed()` call never returns → Nest request hangs indefinitely
- Elasticsearch cluster overloaded → `client.search()` never returns → Nest request hangs indefinitely
- Expected: Both calls timeout after 4-5s, fallback to Postgres path with warning in `meta.warnings`

### Bug Condition C-SS-6: Ward Whitelist Missing

The bug manifests when a query contains an actual ward name from the database, but `searchIntent()` sets `filters.ward` incorrectly (undefined or wrong string). The root cause is the absence of a ward whitelist (`KNOWN_WARDS`). The current implementation uses `extractPhraseAfter` which extracts text after markers and trims `STOP_WORDS`, easily failing when queries have noise (e.g., "ở Hòa Khánh Bắc, quận Liên Chiểu" prioritizes district over ward).

**Formal Specification:**
```
FUNCTION isBugCondition_C_SS_6(input)
  INPUT: input of type QueryString
  OUTPUT: boolean
  
  cache := locationNames()
  normalized := normalizeSearchText(input.query)
  
  actualWardInQuery := EXISTS ward IN cache.wards WHERE normalized CONTAINS ward
  intent := searchIntent(input.query)
  wardSetCorrectly := intent.filters.ward IS NOT NULL
                      AND cache.wards.has(intent.filters.ward)
                      AND normalized CONTAINS intent.filters.ward
  
  RETURN actualWardInQuery AND NOT wardSetCorrectly
END FUNCTION
```

**Examples:**
- Query: "vùng nào nhiều nhà nhất ở Hòa Khánh Bắc" → `filters.ward` should be `"hoa khanh bac"` but is `undefined` or misidentified
- Query: "tại phường Khuê Mỹ" → `filters.ward` should be `"khue my"` but is `undefined`
- Query: "ở Hòa Khánh Bắc, quận Liên Chiểu" → Should set BOTH `filters.ward = "hoa khanh bac"` AND `filters.district = "lien chieu"`

### Bug Condition C-SS-7: Frontend Request Racing

The bug manifests in `MapWrapper.js` `runPropertySearch` when: (a) user calls `runPropertySearch` while a previous `fetch("/api/properties?query=...")` is still running, AND the old fetch is NOT aborted via `AbortController.abort()`; OR (b) a fetch runs longer than `TOTAL_UI_DEADLINE_MS` (default 8000ms) without a UI deadline timer canceling it.

**Formal Specification:**
```
FUNCTION isBugCondition_C_SS_7(input)
  INPUT: input of type UserInteraction
  OUTPUT: boolean
  
  hasActiveRequest := propertySearchAbortRef.current IS NOT NULL
                      AND propertySearchAbortRef.current.signal.aborted = false
  
  newRequestStarted := input.action = "runPropertySearch"
  oldRequestNotAborted := hasActiveRequest AND NOT abortCalled(propertySearchAbortRef.current)
  
  requestExceedsDeadline := input.fetchDuration > TOTAL_UI_DEADLINE_MS
                            AND NOT timeoutTimerFired
  
  RETURN (newRequestStarted AND oldRequestNotAborted) OR requestExceedsDeadline
END FUNCTION
```

**Examples:**
- User types "vùng nào" → Request A starts → User types "vùng nào nhiều nhà" → Request B starts → Request A not aborted → Race condition
- Request takes 12s → No timeout timer → UI spinner indefinitely
- Expected: Request A aborted when B starts; Request times out at 8s with clear message

### Bug Condition C-SS-8: Stop Words vs Intent Keywords

The bug manifests when the same `STOP_WORDS` set is used for both filtering search tokens (`searchTokens`) and for `extractPhraseAfter` (removing fillers from phrases after markers). Words like `nhieu`, `mat`, `do`, `day`, `dac`, `nhat` are treated as stop words — correct for tokenization but INCORRECT for intent classification (these words are needed to recognize density intent).

**Formal Specification:**
```
FUNCTION isBugCondition_C_SS_8(input)
  INPUT: input of type QueryString
  OUTPUT: boolean
  
  normalized := normalizeSearchText(input.query)
  
  containsDensityKeywords := normalized CONTAINS_ANY_OF ['nhieu', 'mat', 'do', 'day', 'dac', 'nhat']
  
  tokens := searchTokens(normalized)  // Uses STOP_WORDS to filter
  densityKeywordsRemoved := NOT (tokens CONTAINS_ANY_OF ['nhieu', 'mat', 'do', 'day', 'dac', 'nhat'])
  
  intentMisclassified := isDensityQuestion(normalized) = false
                         DUE TO densityKeywordsRemoved
  
  RETURN containsDensityKeywords AND densityKeywordsRemoved AND intentMisclassified
END FUNCTION
```

**Examples:**
- Query: "vùng nào nhiều nhà nhất" → `searchTokens` removes `nhieu`, `nhat` → Intent classifier can't detect density
- Expected: Separate `STOP_WORDS_FOR_TOKENS` (for tokenization) and `INTENT_KEYWORDS` (preserved for classification)

### Bug Condition C-SS-9: Density Worst-Case Timeout

The bug manifests when: (a) a density intent has ward/district match but query still takes >1s (worst-case when index not yet created); OR (b) density intent has NO ward/district match AND `densitySearchTerms` is empty or contains only terms <3 chars, leading to `densityRegions`/`densityTotal` attempting full table LIKE-scan on 4GB SQLite.

**Formal Specification:**
```
FUNCTION isBugCondition_C_SS_9(input)
  INPUT: input of type DensityIntent
  OUTPUT: boolean
  
  hasWardOrDistrict := input.filters.ward IS NOT NULL OR input.filters.district IS NOT NULL
  hasValidSearchTerms := input.densitySearchTerms.length > 0
                         AND (EXISTS term IN input.densitySearchTerms WHERE term.length >= 3)
  
  worstCaseA := hasWardOrDistrict AND queryDuration(input) > 1000  // ms
  worstCaseB := NOT hasWardOrDistrict AND NOT hasValidSearchTerms
  
  RETURN worstCaseA OR worstCaseB
END FUNCTION
```

**Examples:**
- Query: "vùng nào nhiều nhà nhất" (no ward/district, no valid terms) → Attempts full table scan → Hangs 30-60s
- Query: "vùng nào nhiều nhà nhất ở Hòa Khánh Bắc" (has ward but index not created yet) → Takes 5s
- Expected: Worst-case B returns immediate error "Vui lòng thu hẹp khu vực"; Worst-case A times out at 5s with same message


## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

1. **Existing Density Intent Recognition**: Queries already matching current density keywords (`day dac`, `mat do`, `dong nhat`, `nhieu nhat`) with region and property indicators must continue returning `intent.type = "density"` with `direction = "highest"` and `map.type = "property-density"` response shape unchanged.

2. **Count Intent Preservation**: Queries with count intent (e.g., "có bao nhiêu nhà ở Hải Châu") must continue returning `intent.type = "count"` without being misclassified as `density`.

3. **List Intent Preservation**: Pure list queries (e.g., "danh sách nhà ở Hải Châu") must continue returning `intent.type = "list"` with current `map` field behavior.

4. **Elasticsearch Path Routing**: When `PROPERTY_SEARCH_PROVIDER=elasticsearch`, the provider must continue running ONLY for `intent.type === "list"`; density intents (both old and expanded) must continue using Postgres path.

5. **Single Region Hydration**: When density response has exactly one region (`regions.length === 1`), `regions[0].objects` must continue being fully hydrated as currently implemented.

6. **Object Budget Limit**: The total object limit via `DEFAULT_DENSITY_OBJECT_LIMIT` (350) must continue being enforced to control payload size.

7. **PropertyDensityObject Shape**: The shape of each density object (fields: `id`, `type`, `center`, `bbox`, `geometry`, `geometrySource`, `properties`) must remain unchanged.

8. **Region Sort Order**: The order of regions in `map.regions[]` (sorted by `count` according to `direction`) must remain unchanged.

9. **Fallback for Non-Matched Locations**: When density intent has no ward/district match in `locationNames()` cache, behavior must continue falling back to timeout mechanism with "Vui lòng thu hẹp khu vực" message.

10. **Response Shape Consistency**: The shape of density responses (`map.regions`, `answer`, `meta.total`) must remain unchanged for both exact-match and LIKE-scan branches.

11. **BetterSqlite Unavailability Handling**: When `BetterSqliteService` is unavailable (`this.sqlite` is undefined), behavior must continue returning `regions: []` without crashing.

12. **Prisma Schema Immutability**: Prisma schema must remain unchanged; runtime indexes created via `CREATE INDEX IF NOT EXISTS` in `BetterSqliteService` boot path, NOT touching `prisma/schema.prisma`.

13. **Detail Endpoint Heavy Fields**: The `GET /properties/:id` endpoint (single property detail) must continue returning full `geometry`, `attributes`, `embedding` as currently implemented.

14. **List Response Required Fields**: Response `items[]` for list intent must continue containing all fields currently read by UI: `id`, `code`, `name`, `addressLine`, `street`, `ward`, `district`, `city`, `propertyType`, `status`, `source`, `level`, `height`, `floors`, `areaSqm`, `centroidLat`, `centroidLng`, `bbox`, `searchText`, `createdAt`, `updatedAt`.

15. **Density Object Spatial Fields**: Density response `map.regions[].objects[]` must continue containing `bbox` (for polygon rendering) and `centroidLat`/`Lng` (via `propertyObjectCenter`) as `densityObject()` requires both.

16. **Export Endpoint Heavy Fields**: Export endpoints explicitly requesting heavy fields must continue returning `geometry`, `attributes`, `embedding`.

17. **Healthy Service Fast Path**: When MiniLM and Elasticsearch are both healthy and respond <1s, provider must continue returning successful response with `searchMode: "elasticsearch-minilm-hybrid"` and `semanticModel` field as currently implemented.

18. **Non-Elasticsearch Provider Bypass**: When `PROPERTY_SEARCH_PROVIDER` is not `"elasticsearch"`, behavior must continue bypassing provider entirely; no timeout-related changes.

19. **Postgres Fallback Shape**: The shape of fallback responses (Postgres path) must continue matching current Postgres path responses (`searchMode: "postgres-normalized-*"`, complete `items`, `meta`).

20. **Elasticsearch Ping Failure Fallback**: When Elasticsearch ping fails (`this.client.ping()` throws), behavior must continue falling back to Postgres path via existing try/catch.

21. **Non-Ward Queries Fallback**: When query doesn't contain any ward name in `locationNames().wards`, behavior must continue running `extractPhraseAfter` as currently implemented (fallback). `filters.ward` may still be set from phrase after marker `phuong`/`o`.

22. **District Matching Preservation**: Matching districts via `DANANG_DISTRICTS` must continue unchanged for existing districts (`cam le`, `hai chau`, `hoa vang`, `lien chieu`, `ngu hanh son`, `son tra`, `thanh khe`).

23. **BetterSqlite Cache Unavailability**: When `BetterSqliteService` is unavailable (cache cannot be built), behavior must continue falling back to `extractPhraseAfter` without crashing.

24. **LocationNames Lazy Cache**: The `locationNames()` cache must continue building once on first call (lazy cache); no invalidation required by this spec.

25. **Single Request Fast Response**: When only one request is active and response arrives <8s, behavior must continue rendering `items`, `answer`, `map` correctly as currently implemented.

26. **Form Trigger Preservation**: Behavior for pressing "Enter" in form, clicking sample question chips, clicking history chips must continue triggering `runPropertySearch` as currently implemented.

27. **AnalyzeImage AbortController**: Behavior for `analyzeImage` (which has its own AbortController) must continue unchanged by this spec.

28. **ClearWorkspace Abort**: The `clearWorkspace` function already aborting `abortControllerRef.current` must continue working correctly.

29. **Search Token Filtering**: The `searchTokens()` function must continue removing Vietnamese filler words from search tokens (`cho`, `toi`, `danh`, `sach`, `cac`, `tai`, `va`, `co`, `theo`, `ve`, `cua`, `la`, `bao`, `nhung`, `tim`, `building`, ...).

30. **ExtractPhraseAfter Filler Removal**: The `extractPhraseAfter()` function for markers `o`, `phuong`, `quan`, `huyen`, `thuoc` must continue removing filler words from phrases after markers, preserving current ward/district extraction behavior.

31. **Meta Tokens Shape**: The response shape `meta.tokens` (array of final tokens used for search) must remain unchanged for queries like "cho toi danh sach nha o hai chau".

32. **Count and List Intent Preservation**: Intent `count` (`isCountQuestion`) and intent `list` must continue working correctly for queries currently passing tests.

33. **Fast Density with Ward/District**: When density intent has ward/district match and runtime index exists (Requirement 3.8), density response must continue returning in <1s as per Requirement 3 fix check.

34. **Density UI Text Preservation**: Density flow with ward/district doesn't need "Vui lòng thu hẹp khu vực" message — current UI text from Requirement 1 applies.

35. **Density Response Shape with Location**: Response shape (`map`, `answer`, `meta`) must remain unchanged when intent has ward/district.

36. **Lucky Fast Response**: When no ward/district but has ≥1 search term ≥3 chars AND Postgres returns quickly (<3s due to small data), behavior must continue returning density normally.

**Scope:**

All inputs that do NOT trigger the specific bug conditions (C-SS-1 through C-SS-9) should be completely unaffected by this fix. This includes:
- Queries with existing density keywords already working
- Count and list intents functioning correctly
- Single-region density responses
- Detail endpoint requests
- Export endpoint requests
- Healthy external service calls
- Queries without ward names
- Single sequential requests
- Queries with valid search terms and locations


## Hypothesized Root Cause

Based on the bug descriptions and requirements analysis, the most likely root causes are:

### 1. Incomplete Intent Keyword Coverage

**Issue**: The `isDensityQuestion()` function only checks for a limited set of density keywords (`day dac`, `mat do`, `dong nhat`, `nhieu nhat`). Natural language queries use many synonyms and variations that are not recognized.

**Evidence**:
- Queries like "thưa thớt nhất", "ít nhất", "cao nhất" fall through to `list` intent
- No direction detection mechanism exists (highest vs lowest)
- Vietnamese language has rich synonym variations not captured

**Impact**: Users receive irrelevant list results instead of density maps, breaking the expected workflow.

### 2. Single-Region Hydration Logic

**Issue**: The `attachDensityObjects()` function contains logic that only hydrates the first region (`regions[0]`), likely due to:
- Initial implementation assuming single-region responses
- Performance concerns about hydrating all regions
- Missing budget allocation algorithm across multiple regions

**Evidence**:
- Code path only processes `regions[0].objects`
- Other regions have empty `objects[]` arrays
- UI shows empty panels when clicking non-first regions

**Impact**: Multi-region density responses are partially unusable, forcing users to only interact with the first region.

### 3. Query Optimization Path Not Taken

**Issue**: The `densityRegions()` and `densityTotal()` functions use `LIKE '%term%'` pattern matching even when exact ward/district values are available in `intent.filters`. This is likely due to:
- Generic query builder that doesn't distinguish between exact and fuzzy matching
- Missing optimization branch for known location filters
- No runtime indexes to support exact equality queries

**Evidence**:
- 10-60 second response times for queries with specific wards
- Full table scans on 4GB SQLite database
- `termFilters` logic always applied regardless of location match

**Impact**: Severe performance degradation making the feature unusable for specific location queries.

### 4. Default Prisma Projection

**Issue**: Prisma `findMany` calls without explicit `select` clauses return all columns by default, including:
- `geometry`: Full GeoJSON (potentially MB per property)
- `attributes`: Large JSON object with metadata
- `embedding`: 384-dimensional float array

**Evidence**:
- Response payloads >500KB for 10 items
- Slow response times even with small result sets
- Bandwidth waste for fields not used by UI

**Impact**: Unnecessary data transfer slowing responses and consuming bandwidth.

### 5. Missing Timeout Configuration

**Issue**: External service calls to MiniLM (`fetch`) and Elasticsearch (`client.search`) have no timeout configuration. This is likely due to:
- Assumption that services are always fast and reliable
- Missing error handling for hung connections
- No fallback strategy when services are slow

**Evidence**:
- Indefinite hangs when MiniLM service freezes
- No timeout on Elasticsearch queries
- No `AbortSignal` or `requestTimeout` parameters

**Impact**: Single slow external service can hang entire application, affecting all users.

### 6. Phrase Extraction Without Whitelist

**Issue**: The `searchIntent()` function uses `extractPhraseAfter` to find ward/district names by looking for text after markers (`phuong`, `o`, `quan`). Without a whitelist of known wards, this approach:
- Extracts arbitrary text that may not be a valid ward
- Fails when queries have multiple location mentions
- Cannot distinguish between ward and district names

**Evidence**:
- Queries like "ở Hòa Khánh Bắc, quận Liên Chiểu" prioritize district over ward
- No validation against actual database ward values
- `DANANG_DISTRICTS` exists for districts but no equivalent for wards

**Impact**: Location filters set incorrectly, leading to wrong results or failed queries.

### 7. No Request Lifecycle Management

**Issue**: The frontend `runPropertySearch` function doesn't manage request lifecycle:
- No AbortController to cancel old requests when new ones start
- No timeout timer to enforce UI deadline
- Race conditions when user types rapidly

**Evidence**:
- Multiple concurrent requests can complete out of order
- No mechanism to abort old fetches
- UI can hang indefinitely on slow requests

**Impact**: Stale results overwrite fresh results, UI hangs without feedback.

### 8. Overloaded Stop Words Set

**Issue**: The same `STOP_WORDS` set is used for two conflicting purposes:
- Filtering search tokens (correct: remove `cho`, `toi`, `danh`, `sach`)
- Filtering intent keywords (incorrect: removes `nhieu`, `mat`, `do`, `nhat`)

**Evidence**:
- Density keywords are stop words
- Intent classification runs on token-filtered text
- No separation between tokenization and classification vocabularies

**Impact**: Intent classifier cannot detect density queries because keywords are removed before classification.

### 9. No Worst-Case Protection

**Issue**: Density queries without ward/district and without valid search terms attempt full table scans with no protection:
- No early validation of query feasibility
- No timeout on expensive SQLite operations
- `better-sqlite3` synchronous API blocks event loop

**Evidence**:
- Queries like "vùng nào nhiều nhà nhất" (no location) hang 30-60s
- No check for empty `densitySearchTerms`
- No timeout wrapper around `densityRegions()` calls

**Impact**: Vague queries can hang the entire application, affecting all concurrent users.


## Correctness Properties

Property 1: Expanded Density Intent Recognition

_For any_ query where `normalizeSearchText(query)` contains at least one keyword from the expanded density set (`thua thot`, `it nha`, `it nhat`, `vang nha`, `dong duc`, `nhieu nha nhat`, `cao nhat`, `thap nhat`, `dong nhat`) AND contains property indicators (`nha`, `toa nha`, `can nha`, `building`, `bat dong san`) AND contains region indicators (`vung`, `khu`, `noi`, `cho`), the fixed `isDensityQuestion()` function SHALL return `true`, the `SearchIntent` SHALL have `type = "density"` and appropriate `direction` value (`"highest"` or `"lowest"`), and the response SHALL contain `map.type = "property-density"` with `regions[]` array.

**Validates: Requirements 1.5, 1.6, 1.7, 1.8, 1.9, 1.10**

Property 2: Multi-Region Object Hydration

_For any_ density response where `map.regions.length > 1`, the fixed `attachDensityObjects()` function SHALL hydrate `objects[]` for ALL regions in proportion to their `count` values, with total objects ≤ `DEFAULT_DENSITY_OBJECT_LIMIT` (350), ensuring each region with `count > 0` has at least 1 object, and the budget allocation follows the formula `take_i = floor(350 * count_i / sum(count))` with remainder added to `regions[0]`.

**Validates: Requirements 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 3: Exact Location Matching Performance

_For any_ density intent where `filters.ward` or `filters.district` matches a value in `locationNames()` cache, the fixed `densityRegions()` and `densityTotal()` functions SHALL use exact equality predicates (`WHERE ward = ?` and/or `WHERE district = ?`) instead of `LIKE` patterns, SHALL NOT include `termFilters` in the SQL WHERE clause for this path, and SHALL return results in <1 second when runtime indexes exist.

**Validates: Requirements 3.5, 3.6, 3.7, 3.10, 3.11**

Property 4: Light Projection for Search Results

_For any_ call to `prisma.buildingProperty.findMany` from `searchPropertiesPostgres` (list/count intents) or `attachDensityObjects` (density intent), the fixed code SHALL pass `select: selectLightPropertyFields()` which omits `geometry`, `attributes`, and `embedding` fields, and the response `items[]` or `map.regions[].objects[]` SHALL NOT contain these heavy fields while maintaining all required UI fields (`id`, `code`, `name`, `addressLine`, `street`, `ward`, `district`, `city`, `propertyType`, `status`, `source`, `level`, `height`, `floors`, `areaSqm`, `centroidLat`, `centroidLng`, `bbox`, `searchText`, `createdAt`, `updatedAt`).

**Validates: Requirements 4.5, 4.6, 4.7, 4.10, 4.11, 4.12**

Property 5: Backend Service Timeout and Fallback

_For any_ call to MiniLM embedding service or Elasticsearch search, the fixed `ElasticsearchPropertySearchProvider` SHALL enforce timeouts (`EMBEDDING_TIMEOUT_MS` default 4000ms, `ELASTICSEARCH_TIMEOUT_MS` default 5000ms) via `AbortSignal.timeout()` or `requestTimeout` option, and when timeout occurs, SHALL throw an error with message starting with "Embedding service timed out after" or "Elasticsearch search timed out after", which SHALL be caught by `searchProperties()` to fallback to Postgres path and append exactly one warning to `meta.warnings[]` ("MiniLM embedding timed out; used PostgreSQL fallback." or "Elasticsearch search timed out; used PostgreSQL fallback.").

**Validates: Requirements 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12**

Property 6: Ward Whitelist Matching

_For any_ query containing a ward name that exists in the database, the fixed `searchIntent()` function SHALL build a ward whitelist from `locationNames().wards` (populated via `SELECT DISTINCT ward FROM BuildingProperty WHERE ward IS NOT NULL AND deletedAt IS NULL`), SHALL apply priority matching: (1) exact ward match → set `filters.ward`, (2) exact district match → set `filters.district`, (3) `extractPhraseAfter("phuong")` fallback, (4) `extractPhraseAfter("quan"/"huyen"/"thuoc"/"o")` fallback, and SHALL choose the longest matching ward when multiple matches exist.

**Validates: Requirements 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11**

Property 7: Frontend Request Cancellation and Deadline

_For any_ invocation of `runPropertySearch` in `MapWrapper.js`, the fixed code SHALL create a new `AbortController`, SHALL abort any previous active controller in `propertySearchAbortRef.current` before starting the new request, SHALL pass `signal: controller.signal` to the fetch call, SHALL set a timeout timer for `TOTAL_UI_DEADLINE_MS` (default 8000ms) that aborts the controller and displays "Tìm kiếm quá lâu, vui lòng thu hẹp truy vấn" status, and SHALL NOT update state when fetch rejects with `AbortError`.

**Validates: Requirements 7.5, 7.6, 7.7, 7.8, 7.9, 7.11, 7.12**

Property 8: Separated Stop Words and Intent Keywords

_For any_ query processing, the fixed code SHALL use separate sets: `STOP_WORDS_FOR_TOKENS` (for `searchTokens()` and `extractPhraseAfter()` internal trimming) and `INTENT_KEYWORDS` (preserved for intent classification), SHALL ensure these sets have no overlap, SHALL run `isDensityQuestion()`, `isCountQuestion()`, and `densityDirection()` on the original `normalizedQuery` before stop word filtering, and SHALL fallback to timeout mechanism when `intent.type === "density"` AND no ward/district AND `densitySearchTerms` is empty.

**Validates: Requirements 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11**

Property 9: Density Worst-Case Protection

_For any_ density intent, the fixed code SHALL enforce `DENSITY_BACKEND_TIMEOUT_MS` (default 5000ms) via `Promise.race` wrapping `densityRegions()` and `densityTotal()` calls, SHALL immediately return (without running SQL) when no ward/district AND no valid search terms ≥3 chars with response containing `items: []`, `answer.text: "Vui lòng thu hẹp khu vực..."`, `map.regions: []`, `meta.warnings` with appropriate message, and `meta.timedOut: true` when timeout fires or `false` when immediate return, and SHALL return HTTP 200 (not 500) to allow UI to render the answer text.

**Validates: Requirements 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11**


## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the following changes are required across backend and frontend:

#### File: `apps/api/src/properties/properties.service.ts`

**Function**: Multiple functions (`isDensityQuestion`, `searchIntent`, `densityRegions`, `densityTotal`, `attachDensityObjects`, `searchPropertiesPostgres`, `searchAnswer`)

**Specific Changes**:

1. **Expand Density Intent Keywords**:
   - Add new density keyword sets to `isDensityQuestion()`:
     - High density: `nhieu nha nhat`, `cao nhat`, `dong nhat`, `dong duc`, `day dac`, `mat do`
     - Low density: `thua thot`, `it nha`, `it nhat`, `vang nha`, `thap nhat`
   - Create new helper `densityDirection(normalizedQuery: string): "highest" | "lowest"`:
     - Return `"lowest"` if query contains low density keywords
     - Return `"highest"` otherwise (default for backward compatibility)
   - Update `SearchIntent` interface to include `direction?: "highest" | "lowest"` field
   - Call `densityDirection()` in `searchIntent()` when `isDensityQuestion()` returns true

2. **Implement Multi-Region Hydration**:
   - Modify `attachDensityObjects()` to process all regions, not just `regions[0]`
   - Implement budget allocation algorithm:
     ```typescript
     const totalCount = regions.reduce((sum, r) => sum + r.count, 0);
     const allocations = regions.map(r => ({
       region: r,
       take: Math.max(1, Math.floor(DEFAULT_DENSITY_OBJECT_LIMIT * r.count / totalCount))
     }));
     const remainder = DEFAULT_DENSITY_OBJECT_LIMIT - allocations.reduce((sum, a) => sum + a.take, 0);
     allocations[0].take += remainder;
     ```
   - Use `Promise.all()` to fetch objects for all regions in parallel:
     ```typescript
     const objectsByRegion = await Promise.all(
       allocations.map(({ region, take }) =>
         prisma.buildingProperty.findMany({
           where: {
             centroidLat: { gte: region.bbox.south, lte: region.bbox.north },
             centroidLng: { gte: region.bbox.west, lte: region.bbox.east },
             deletedAt: null
           },
           select: selectLightPropertyFields(),
           take
         })
       )
     );
     ```

3. **Optimize Location Filtering**:
   - Modify `densityRegions()` and `densityTotal()` to check if `filters.ward` or `filters.district` match `locationNames()` cache
   - When matched, use exact equality predicates:
     ```typescript
     if (filters.ward && locationNames().wards.has(filters.ward)) {
       whereClause.ward = filters.ward;
       // Skip termFilters for this path
     } else if (filters.district && locationNames().districts.has(filters.district)) {
       whereClause.district = filters.district;
       // Skip termFilters for this path
     } else {
       // Fallback to LIKE with termFilters
     }
     ```
   - Ensure `densityLocationFilters()` helper is reused (DRY)

4. **Implement Light Projection**:
   - Create `selectLightPropertyFields()` helper (or import from separate file):
     ```typescript
     function selectLightPropertyFields(options?: { withGeometry?: boolean }) {
       return {
         id: true,
         code: true,
         name: true,
         addressLine: true,
         street: true,
         ward: true,
         district: true,
         city: true,
         propertyType: true,
         status: true,
         source: true,
         level: true,
         height: true,
         floors: true,
         areaSqm: true,
         centroidLat: true,
         centroidLng: true,
         bbox: true,
         searchText: true,
         createdAt: true,
         updatedAt: true,
         ...(options?.withGeometry && { geometry: true, attributes: true, embedding: true })
       };
     }
     ```
   - Apply to all `findMany` calls in `searchPropertiesPostgres` (both rank and fuzzy fallback)
   - Apply to `attachDensityObjects` hydration queries
   - Update `densityObject()` to handle `geometry === undefined` by falling back to `bbox` + `center`

5. **Separate Stop Words and Intent Keywords**:
   - Rename `STOP_WORDS` to `STOP_WORDS_FOR_TOKENS`
   - Create new `INTENT_KEYWORDS` set containing density, count, property, and region keywords
   - Ensure intent classification functions (`isDensityQuestion`, `isCountQuestion`, `densityDirection`) operate on `normalizedQuery` BEFORE token filtering
   - Add validation: `assert([...STOP_WORDS_FOR_TOKENS].every(w => !INTENT_KEYWORDS.has(w)))`

6. **Implement Density Worst-Case Protection**:
   - Add constant `DENSITY_BACKEND_TIMEOUT_MS = parseInt(process.env.DENSITY_BACKEND_TIMEOUT_MS) || 5000`
   - Wrap `densityRegions()` and `densityTotal()` calls in `Promise.race`:
     ```typescript
     const timeoutPromise = new Promise((_, reject) =>
       setTimeout(() => reject(new Error('Density query timeout')), DENSITY_BACKEND_TIMEOUT_MS)
     );
     try {
       const regions = await Promise.race([densityRegions(...), timeoutPromise]);
     } catch (error) {
       if (error.message.includes('timeout')) {
         return {
           items: [],
           answer: { type: 'density', count: 0, filters, text: 'Vui lòng thu hẹp khu vực...' },
           map: { type: 'property-density', regions: [] },
           meta: { warnings: ['Density query timed out; please specify ward or district.'], timedOut: true }
         };
       }
       throw error;
     }
     ```
   - Add early return when no ward/district AND no valid search terms:
     ```typescript
     if (intent.type === 'density' && !filters.ward && !filters.district && densitySearchTerms.length === 0) {
       return {
         items: [],
         answer: { type: 'density', count: 0, filters, text: 'Vui lòng thu hẹp khu vực...' },
         map: { type: 'property-density', regions: [] },
         meta: { warnings: ['Density query requires a ward or district; none detected.'], timedOut: false }
       };
     }
     ```

7. **Update Search Answer Generation**:
   - Modify `searchAnswer()` to check `intent.direction` when `intent.type === "density"`
   - Generate appropriate text:
     - `direction === "lowest"`: Use "thưa thớt nhất" or "ít nhất"
     - `direction === "highest"`: Use "nhiều nhất" or "dày đặc nhất"
   - Include `meta.densityDirection` in response

8. **Implement Ward Whitelist Matching**:
   - Extend `locationNames()` to include `wards: Map<string, string>`:
     ```typescript
     const wardRows = await this.sqlite.all(
       'SELECT DISTINCT ward FROM BuildingProperty WHERE ward IS NOT NULL AND deletedAt IS NULL'
     );
     const wards = new Map(wardRows.map(r => [normalizeSearchText(r.ward), r.ward]));
     ```
   - Create helper `matchKnownWard(normalizedQuery: string, wardCache: Map<string, string>): string | undefined`:
     - Find all wards where `normalizedQuery.includes(normalizedWard)`
     - Return longest match (most specific)
   - Update `searchIntent()` to apply priority matching:
     1. Ward exact match via `matchKnownWard()`
     2. District exact match via existing `matchKnownDistrict()`
     3. `extractPhraseAfter("phuong")` fallback
     4. `extractPhraseAfter("quan"/"huyen"/"thuoc"/"o")` fallback

#### File: `apps/api/src/properties/elasticsearch-property-search.provider.ts`

**Function**: `embed()`, `searchHits()`

**Specific Changes**:

1. **Add Timeout Constants**:
   ```typescript
   private readonly EMBEDDING_TIMEOUT_MS = Math.min(
     parseInt(process.env.EMBEDDING_TIMEOUT_MS) || 4000,
     30000
   );
   private readonly ELASTICSEARCH_TIMEOUT_MS = Math.min(
     parseInt(process.env.ELASTICSEARCH_TIMEOUT_MS) || 5000,
     30000
   );
   ```

2. **Add Timeout to MiniLM Fetch**:
   - Modify `embed()` to pass `AbortSignal.timeout()`:
     ```typescript
     const response = await this.fetchImpl(`${url}/embed`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ text }),
       signal: AbortSignal.timeout(this.EMBEDDING_TIMEOUT_MS)
     });
     ```
   - Catch `AbortError` and re-throw with clear message:
     ```typescript
     catch (error) {
       if (error.name === 'AbortError') {
         throw new Error(`Embedding service timed out after ${this.EMBEDDING_TIMEOUT_MS}ms`);
       }
       throw error;
     }
     ```

3. **Add Timeout to Elasticsearch Search**:
   - Modify `searchHits()` to pass `requestTimeout`:
     ```typescript
     const result = await this.client.search({
       index: this.indexName,
       body: { query, size, _source },
       requestTimeout: this.ELASTICSEARCH_TIMEOUT_MS
     });
     ```
   - Catch timeout error and re-throw with clear message:
     ```typescript
     catch (error) {
       if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
         throw new Error(`Elasticsearch search timed out after ${this.ELASTICSEARCH_TIMEOUT_MS}ms`);
       }
       throw error;
     }
     ```

4. **Update Fallback Handling in properties.service.ts**:
   - Modify try/catch in `searchProperties()` to detect timeout errors:
     ```typescript
     try {
       result = await this.elasticsearchProvider.search(...);
     } catch (error) {
       if (error.message.includes('timed out')) {
         const warning = error.message.includes('Embedding')
           ? 'MiniLM embedding timed out; used PostgreSQL fallback.'
           : 'Elasticsearch search timed out; used PostgreSQL fallback.';
         result = await this.searchPropertiesPostgres(...);
         result.meta.warnings = [...(result.meta.warnings || []), warning];
       } else {
         throw error;
       }
     }
     ```

#### File: `apps/api/src/prisma/better-sqlite.service.ts`

**Function**: `onModuleInit()` or equivalent boot method

**Specific Changes**:

1. **Create Runtime Indexes**:
   - Add index creation after DB connection opens:
     ```typescript
     try {
       this.sqlite.exec(`
         CREATE INDEX IF NOT EXISTS idx_buildingproperty_ward_district
         ON BuildingProperty (deletedAt, source, ward, district)
       `);
       this.logger.log('[BetterSqlite] Ensured index idx_buildingproperty_ward_district');
       
       this.sqlite.exec(`
         CREATE INDEX IF NOT EXISTS idx_buildingproperty_centroid
         ON BuildingProperty (centroidLat, centroidLng)
         WHERE deletedAt IS NULL
       `);
       this.logger.log('[BetterSqlite] Ensured index idx_buildingproperty_centroid');
     } catch (error) {
       this.logger.warn(`[BetterSqlite] Failed to create indexes: ${error.message}`);
       // Continue boot, don't crash
     }
     ```

#### File: `apps/web/components/MapWrapper.js`

**Function**: `runPropertySearch`

**Specific Changes**:

1. **Add AbortController Management**:
   - Create separate ref: `const propertySearchAbortRef = useRef(null);`
   - At start of `runPropertySearch`:
     ```javascript
     // Abort previous request if exists
     if (propertySearchAbortRef.current) {
       propertySearchAbortRef.current.abort();
     }
     
     // Create new controller
     const controller = new AbortController();
     propertySearchAbortRef.current = controller;
     ```

2. **Add UI Deadline Timer**:
   ```javascript
   const TOTAL_UI_DEADLINE_MS = 8000;
   const timeoutId = setTimeout(() => {
     controller.abort();
     setPropertySearchStatus('Tìm kiếm quá lâu, vui lòng thu hẹp truy vấn');
     setIsSearchingProperties(false);
   }, TOTAL_UI_DEADLINE_MS);
   ```

3. **Pass Signal to Fetch**:
   ```javascript
   const response = await fetch(`/api/properties?query=${encodeURIComponent(query)}`, {
     signal: controller.signal
   });
   ```

4. **Handle Abort Error**:
   ```javascript
   catch (error) {
     if (error.name === 'AbortError') {
       // Don't update state - request was canceled
       return;
     }
     // Handle other errors
   } finally {
     clearTimeout(timeoutId);
   }
   ```

5. **Cleanup on Unmount**:
   ```javascript
   useEffect(() => {
     return () => {
       if (propertySearchAbortRef.current) {
         propertySearchAbortRef.current.abort();
       }
     };
   }, []);
   ```


## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code (exploratory bug condition checking), then verify the fixes work correctly and preserve existing behavior (fix checking and preservation checking).

All tests must be verifiable via the commands specified in the requirements Verification Matrix:
- `npm run test:api -- --runInBand`
- `npm run test:web -- --runInBand`
- `npm run build -w @geoai/api`
- `npm run build -w @geoai/web`
- Smoke tests with `curl` (auth-gated, using cookie from `start.bat` flow)

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the bug conditions and assert that the UNFIXED code exhibits the defective behavior. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:

1. **C-SS-1 Expanded Density Intent Test** (will fail on unfixed code):
   - Input: `"vùng nào thưa thớt nhất ở Liên Chiểu"`
   - Assert: `isDensityQuestion(normalizeSearchText(input))` returns `false` (bug present)
   - Assert: `searchIntent(input).type` equals `"list"` (incorrect fallback)
   - Expected after fix: `isDensityQuestion()` returns `true`, `intent.type = "density"`, `direction = "lowest"`

2. **C-SS-2 Multi-Region Hydration Test** (will fail on unfixed code):
   - Setup: Mock `densityRegions()` to return 3 regions with counts [100, 50, 10]
   - Call: `attachDensityObjects(regions, ...)`
   - Assert: `regions[0].objects.length > 0` (passes)
   - Assert: `regions[1].objects.length === 0` (bug present)
   - Assert: `regions[2].objects.length === 0` (bug present)
   - Expected after fix: All regions have objects proportional to count

3. **C-SS-3 LIKE Scan Test** (will fail on unfixed code):
   - Setup: Mock `locationNames()` to return ward "hoa khanh bac"
   - Input: Intent with `filters.ward = "hoa khanh bac"`
   - Spy: `BetterSqliteService.all` to capture SQL
   - Assert: SQL contains `LIKE '%hoa%'` or `LIKE '%khanh%'` (bug present)
   - Expected after fix: SQL contains `WHERE ward = 'hoa khanh bac'` (no LIKE)

4. **C-SS-4 Heavy Projection Test** (will fail on unfixed code):
   - Setup: Seed BuildingProperty with non-null `geometry`, `attributes`, `embedding`
   - Call: `searchPropertiesPostgres({ intent: { type: 'list' }, limit: 1 })`
   - Assert: `result.items[0].geometry` is defined (bug present)
   - Assert: `result.items[0].attributes` is defined (bug present)
   - Assert: `result.items[0].embedding` is defined (bug present)
   - Expected after fix: These fields are undefined

5. **C-SS-5 Timeout Test** (will fail on unfixed code):
   - Setup: Inject `fetchImpl` that returns a Promise that never resolves
   - Call: `embed("test query")`
   - Assert: Call hangs indefinitely (bug present - use timeout in test framework)
   - Expected after fix: Rejects within `EMBEDDING_TIMEOUT_MS + 200` ms with timeout error

6. **C-SS-6 Ward Whitelist Test** (will fail on unfixed code):
   - Setup: Stub `locationNames()` to return wards Map with "hoa khanh bac"
   - Input: `"vùng nào nhiều nhà nhất ở hoa khanh bac"`
   - Call: `searchIntent(input)`
   - Assert: `intent.filters.ward` is undefined or incorrect (bug present)
   - Expected after fix: `intent.filters.ward === "hoa khanh bac"`

7. **C-SS-7 Request Racing Test** (will fail on unfixed code):
   - Setup: Mock `fetch` to delay 1000ms
   - Action: Call `runPropertySearch("query A")`, then immediately call `runPropertySearch("query B")`
   - Assert: Both fetches complete (bug present - no abort)
   - Assert: State reflects query A result (race condition)
   - Expected after fix: Query A fetch is aborted, only query B completes

8. **C-SS-8 Stop Words Test** (will fail on unfixed code):
   - Input: `"vùng nào nhiều nhà nhất"`
   - Call: `searchTokens(normalizeSearchText(input))`
   - Assert: Result does not contain "nhieu" or "nhat" (removed as stop words)
   - Call: `isDensityQuestion(normalizeSearchText(input))`
   - Assert: Returns `false` because keywords were removed (bug present)
   - Expected after fix: Intent classification works on pre-filtered query

9. **C-SS-9 Worst-Case Test** (will fail on unfixed code):
   - Setup: Mock `densityRegions()` to delay 6000ms
   - Input: Density intent without ward/district
   - Call: `searchPropertiesPostgres(intent)`
   - Assert: Call takes >5000ms (bug present - no timeout)
   - Expected after fix: Returns within 5500ms with timeout response

**Expected Counterexamples**:
- Density queries with synonyms fall back to list intent
- Only first region has objects hydrated
- LIKE scans used even when exact ward/district available
- Heavy fields included in responses unnecessarily
- External service calls hang indefinitely
- Ward names not recognized from queries
- Multiple concurrent requests race
- Intent keywords removed by stop word filtering
- Vague density queries hang for 30-60 seconds

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_C_SS_1(input) DO
  result := searchIntent_fixed(input)
  ASSERT result.type = "density"
  ASSERT result.direction IN ["highest", "lowest"]
END FOR

FOR ALL response WHERE isBugCondition_C_SS_2(response) DO
  result := attachDensityObjects_fixed(response.regions)
  ASSERT FOR ALL i: result.regions[i].objects.length > 0 WHERE result.regions[i].count > 0
  ASSERT SUM(result.regions[i].objects.length) <= 350
END FOR

FOR ALL intent WHERE isBugCondition_C_SS_3(intent) DO
  sql := generateDensitySQL_fixed(intent)
  ASSERT sql NOT CONTAINS "LIKE"
  ASSERT sql CONTAINS "WHERE ward = ?" OR "WHERE district = ?"
  duration := measureQueryTime(sql)
  ASSERT duration < 1000  // ms
END FOR

FOR ALL call WHERE isBugCondition_C_SS_4(call) DO
  result := findMany_fixed(call.options)
  ASSERT result[0].geometry IS UNDEFINED
  ASSERT result[0].attributes IS UNDEFINED
  ASSERT result[0].embedding IS UNDEFINED
END FOR

FOR ALL call WHERE isBugCondition_C_SS_5(call) DO
  startTime := now()
  TRY
    result := externalServiceCall_fixed(call)
  CATCH error
    ASSERT error.message CONTAINS "timed out"
    ASSERT (now() - startTime) < (TIMEOUT_MS + 500)
  END TRY
END FOR

FOR ALL query WHERE isBugCondition_C_SS_6(query) DO
  intent := searchIntent_fixed(query)
  ASSERT intent.filters.ward IS NOT NULL
  ASSERT locationNames().wards.has(intent.filters.ward)
END FOR

FOR ALL interaction WHERE isBugCondition_C_SS_7(interaction) DO
  runPropertySearch_fixed("query A")
  runPropertySearch_fixed("query B")
  ASSERT fetchA.signal.aborted = true
  ASSERT state reflects query B result only
END FOR

FOR ALL query WHERE isBugCondition_C_SS_8(query) DO
  intent := searchIntent_fixed(query)
  ASSERT intent.type = "density"  // Keywords not removed
END FOR

FOR ALL intent WHERE isBugCondition_C_SS_9(intent) DO
  startTime := now()
  result := searchPropertiesPostgres_fixed(intent)
  duration := now() - startTime
  ASSERT duration < 5500  // ms
  ASSERT result.meta.timedOut = true OR result.meta.warnings.length > 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition_C_SS_1(input) DO
  ASSERT searchIntent_original(input) = searchIntent_fixed(input)
END FOR

FOR ALL response WHERE NOT isBugCondition_C_SS_2(response) DO
  ASSERT attachDensityObjects_original(response) = attachDensityObjects_fixed(response)
END FOR

FOR ALL intent WHERE NOT isBugCondition_C_SS_3(intent) DO
  ASSERT densityRegions_original(intent) = densityRegions_fixed(intent)
END FOR

FOR ALL call WHERE NOT isBugCondition_C_SS_4(call) DO
  ASSERT findMany_original(call) = findMany_fixed(call)
END FOR

FOR ALL call WHERE NOT isBugCondition_C_SS_5(call) DO
  ASSERT externalServiceCall_original(call) = externalServiceCall_fixed(call)
END FOR

FOR ALL query WHERE NOT isBugCondition_C_SS_6(query) DO
  ASSERT searchIntent_original(query) = searchIntent_fixed(query)
END FOR

FOR ALL interaction WHERE NOT isBugCondition_C_SS_7(interaction) DO
  ASSERT runPropertySearch_original(interaction) = runPropertySearch_fixed(interaction)
END FOR

FOR ALL query WHERE NOT isBugCondition_C_SS_8(query) DO
  ASSERT searchTokens_original(query) = searchTokens_fixed(query)
END FOR

FOR ALL intent WHERE NOT isBugCondition_C_SS_9(intent) DO
  ASSERT searchPropertiesPostgres_original(intent) = searchPropertiesPostgres_fixed(intent)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: For each bug condition, identify the complement set (NOT C) and write tests that verify behavior is unchanged. Use existing test suites as regression tests.

**Test Cases**:

1. **Existing Density Keywords Preservation**:
   - Queries: "vùng nào nhiều nhà nhất", "khu vực dày đặc nhất", "mật độ đông nhất"
   - Assert: All return `intent.type = "density"`, `direction = "highest"`
   - Assert: Response shape unchanged

2. **Count Intent Preservation**:
   - Query: "có bao nhiêu nhà ở Hải Châu"
   - Assert: `intent.type = "count"` (not misclassified as density)

3. **List Intent Preservation**:
   - Query: "danh sách nhà ở Hải Châu"
   - Assert: `intent.type = "list"`
   - Assert: Response shape unchanged

4. **Single Region Preservation**:
   - Response with 1 region
   - Assert: `regions[0].objects` fully hydrated as before

5. **Detail Endpoint Preservation**:
   - Request: `GET /properties/:id`
   - Assert: Response includes `geometry`, `attributes`, `embedding`

6. **Healthy Service Preservation**:
   - MiniLM and Elasticsearch respond <1s
   - Assert: Response has `searchMode: "elasticsearch-minilm-hybrid"`
   - Assert: No warnings in `meta.warnings`

7. **Non-Ward Query Preservation**:
   - Query without any ward names
   - Assert: `extractPhraseAfter` fallback works as before

8. **Search Token Filtering Preservation**:
   - Query: "cho toi danh sach nha o hai chau"
   - Assert: `searchTokens()` removes filler words as before
   - Assert: Result doesn't contain "cho", "toi", "danh", "sach", "o"

9. **Fast Density with Location Preservation**:
   - Query with ward/district match and runtime index
   - Assert: Response <1s as per Requirement 3 fix

### Unit Tests

**File**: `apps/api/src/properties/properties.service.spec.ts`

- Test `isDensityQuestion()` with expanded keywords
- Test `densityDirection()` returns correct direction
- Test `searchIntent()` sets `direction` field
- Test `attachDensityObjects()` budget allocation algorithm
- Test `densityRegions()` SQL generation for exact vs LIKE paths
- Test `selectLightPropertyFields()` omits heavy fields
- Test `searchIntent()` ward whitelist matching
- Test `STOP_WORDS_FOR_TOKENS` and `INTENT_KEYWORDS` have no overlap
- Test density timeout wrapper returns correct response shape
- Test early return for density without location/terms

**File**: `apps/api/src/properties/elasticsearch-property-search.provider.spec.ts`

- Test `embed()` timeout with mock fetch that never resolves
- Test `searchHits()` timeout with mock client that delays
- Test timeout errors have correct message format
- Test fallback to Postgres path on timeout

**File**: `apps/api/src/prisma/better-sqlite.service.spec.ts`

- Test index creation runs without error
- Test index creation is idempotent (can run multiple times)
- Test service continues boot if index creation fails

**File**: `apps/web/components/__tests__/MapWrapper.test.js` or `apps/web/src/features/map/property-search.test.js`

- Test `runPropertySearch` aborts previous request
- Test `runPropertySearch` doesn't update state on AbortError
- Test UI deadline timer aborts request after 8s
- Test cleanup on unmount aborts active request

### Property-Based Tests

Property-based tests generate random inputs to verify correctness properties hold across the input domain:

1. **Density Intent Recognition Property**:
   - Generate random queries with density keywords + property indicators + region indicators
   - Assert: All classified as `intent.type = "density"`
   - Assert: Direction matches keyword category (high/low)

2. **Multi-Region Budget Property**:
   - Generate random region arrays with varying counts
   - Assert: Total objects ≤ 350
   - Assert: Each region with count > 0 has ≥ 1 object
   - Assert: Budget proportional to count

3. **Light Projection Property**:
   - Generate random findMany calls from search paths
   - Assert: Results never contain `geometry`, `attributes`, `embedding`
   - Assert: Results always contain required UI fields

4. **Ward Matching Property**:
   - Generate random queries containing known ward names
   - Assert: `filters.ward` correctly set
   - Assert: Longest match chosen when multiple wards match

5. **Timeout Property**:
   - Generate random slow external service calls
   - Assert: All timeout within configured limit
   - Assert: All return appropriate error messages

### Integration Tests

Integration tests verify the full flow from HTTP request to response:

1. **End-to-End Density Flow**:
   - Start services via `start.bat`
   - Submit query: "vùng nào thưa thớt nhất ở Liên Chiểu"
   - Assert: Response <2s
   - Assert: `map.type = "property-density"`
   - Assert: `meta.densityDirection = "lowest"`
   - Assert: All regions have objects

2. **End-to-End Performance Flow**:
   - Submit query: "vùng nào nhiều nhà nhất ở Hòa Khánh Bắc"
   - Assert: Response <1s (exact ward match with index)
   - Assert: Payload size reasonable (<200KB)

3. **End-to-End Timeout Flow**:
   - Submit vague query: "xyz xyz xyz"
   - Assert: Response within 5s
   - Assert: `meta.warnings` contains appropriate message

4. **End-to-End Frontend Flow**:
   - Type rapidly in search box
   - Assert: Only latest request completes
   - Assert: No stale results displayed
   - Assert: UI shows timeout message if >8s

### Smoke Tests

Smoke tests using `curl` to verify basic functionality (requires auth cookie from `start.bat` flow):

```bash
# Test 1: Density with low direction
curl "http://localhost:4000/properties?query=vung+nao+thua+thot+nhat+o+lien+chieu"
# Expected: Response <2s, map.type = "property-density", meta.densityDirection = "lowest"

# Test 2: Density with exact ward match
curl "http://localhost:4000/properties?query=vung+nao+nhieu+nha+nhat+o+hoa+khanh+bac"
# Expected: Response <1s, map.regions.length > 0, all regions have objects

# Test 3: List with light projection
curl "http://localhost:4000/properties?query=cho+toi+danh+sach+nha+o+hai+chau&limit=10"
# Expected: Response <1s, items[0] has no geometry/attributes/embedding, payload <100KB

# Test 4: Vague query timeout
curl "http://localhost:4000/properties?query=xyz+xyz+xyz"
# Expected: Response ≤5s, meta.warnings contains "Vui lòng thu hẹp khu vực" or equivalent
```

