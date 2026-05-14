# Requirements Document

## Introduction

This spec bundles a stabilization pass across the GeoAI Web stack (Next.js web, NestJS API, Python GeoAI backend, Elasticsearch, SQLite/Postgres via Prisma). It is intentionally a single bugfix spec because the defects share two triggers and one blocking state:

- Shared triggers:
  1. The single local-dev entrypoint `start.bat`. If it cannot reliably bring up Elasticsearch, the Python backend, the Nest API, and the Next web, nothing else can be validated.
  2. The local-only runtime mode (`GEOAI_LOCAL_DATA_ONLY=true` + `GEOAI_FORCE_OVERTURE_SCAN=true`). The app must stop fetching Overture/GADM/GeoTIFF at runtime and must not silently fall back to AI scan paths that are disabled.
- Shared blocking state:
  1. Red web and API test suites (Vietnamese UI vs English matchers, expired share-route fixture, missing guard wiring, refresh-token collisions, Prisma NAPI failures against a 4 GB SQLite).
  2. Runtime slowness in `/api/properties` and dashboard aggregation because default Prisma projections pull heavy `geometry` / `attributes` / `embedding` fields.

Treating these defects as one spec is a DRY move: all fixes ride on the same helpers (`is_local_data_only()`, a shared Prisma light-select projection, a shared Vietnamese test-label helper, a shared per-service port-and-health probe) and on the same verification matrix. Per YAGNI, no new product features are in scope; this spec only restores "Done" and "Foundation Only" items from `docs/backlog-progress.md` and `docs/plan.md` to a green, operable baseline.

The acceptance flow the user must be able to perform end-to-end after this spec lands:

1. Start Docker Desktop manually.
2. Run `start.bat`.
3. Open `http://localhost:3000`.
4. Log in, open the map, run an Overture scan against local Da Nang data, without any Overture/GADM/GeoTIFF download attempt.

## Glossary

- **Bug Condition `C(X)`**: A predicate over inputs or runtime state that identifies which invocations trigger a defect. Fixes are validated on inputs satisfying `C(X)`.
- **Preservation Check**: A test that pins current-correct behavior for inputs where `NOT C(X)`. It must pass both before and after the fix. It guards against regressions.
- **Fix Check**: A test covering inputs where `C(X)` holds. It must fail on the unfixed code `F` and pass on the fixed code `F'`.
- **Local-Data-Only Mode**: The runtime mode enabled by `GEOAI_LOCAL_DATA_ONLY=true`. The Python backend must not download, refresh, or write Overture/GADM/GeoTIFF assets; the `/download-data` HTTP endpoint must return `409 Conflict`.
- **Force-Overture-Scan Mode**: The runtime mode enabled by `GEOAI_FORCE_OVERTURE_SCAN=true`. The backend coerces any non-Overture scan mode (including `geoai`) to `overture` and reports `scanMode: "overture"` and a local Overture `dataSource` in the response.
- **Overture**: Overture Maps Foundation building footprints. Locally cached under `geoai_data/`. Treated as read-only at runtime.
- **GADM**: GADM administrative boundary dataset. Used for ward/district clipping. Treated as read-only at runtime; download calls must be blocked when local boundaries exist, otherwise a bbox fallback is used.
- **GeoTIFF**: Raster elevation/imagery used by the Python backend. Treated as read-only at runtime; cache-miss downloads are blocked.
- **Overture Dataset**: The local GeoPackage (`.gpkg`) and JSON assets under `geoai_data/` that power Overture-mode scans without any network call.
- **Light Property Projection**: The shared Prisma `select` shape used by property list/search/export that omits `geometry`, `attributes`, and `embedding` unless a caller explicitly opts in.

## Assumptions

- Docker Desktop is started manually by the operator before `start.bat` runs. `start.bat` is allowed to call `docker info` and fail fast with a clear message if Docker is not running.
- The Elasticsearch container (`docker-compose.search.yml`) is expected to come up, but the Nest API semantic-search provider stays opt-in behind `USE_ELASTICSEARCH=1`. Without that flag, the API must continue to serve search from the non-Elasticsearch provider.
- The existing `geoai_data/` directory is preserved across all cleanups. `.env`, `.venv`, and `.venv310` are never deleted or rewritten by this spec's work.
- The Python backend uses the `.venv310` interpreter by default with fallbacks `.venv` then `python` on `PATH`.
- No database schema migrations, no new external dependencies, and no large-scale module splits (for example, splitting `geoai_backend.py`) are performed in this spec.
- The Vietnamese UI strings shipped today in `MeasurementToolbar`, `MapWrapperMeasurement`, and `LayerPanel` are authoritative. Tests adapt to the UI, not the other way around, unless the UI string itself is demonstrably wrong.
- `docs/backlog-progress.md` is the source of truth for what counts as a regression. Items not marked Done or Foundation Only are out of scope for this spec.

## Out of Scope (YAGNI)

- New feature work listed under Phases 11 / 12 / 13 of `docs/plan.md`:
  - Phase 11 asset import/export beyond the currently shipping Overture path (`EP03-052 -> EP03-068`).
  - Phase 12 maintenance scheduling (`EP03-035 -> EP03-051`).
  - Phase 13 heatmap density analytics (`EP05-001 -> EP05-016`).
- Buffer analysis (`EP05-017 -> EP05-032`), route optimization (`EP05-033 -> EP05-048`), choropleth/admin stats (`EP05-049 -> EP05-064`).
- API key CRUD and admin catalogs that remain in Foundation Only (`EP02-018 -> EP02-034`, `EP02-035 -> EP02-068`, `EP02-069 -> EP02-102`, `EP02-103 -> EP02-119`).
- Dossier, maintenance, and spatial edit features not already marked Done (`EP03-018 -> EP03-034` beyond current shipping behavior, `EP01-086 -> EP01-102`).
- SQL review/editing, predictive maintenance, image recognition, AI report generation (`EP04-017 -> EP04-080`).
- Any Prisma schema change. Any new Prisma model. Any new dependency in `package.json` or `requirements.txt`.
- Splitting `geoai_backend.py` into multiple modules. Refactors are limited to an internal `Runtime flags` block and an `is_local_data_only()` guard helper.
- Large UI layout rewrites. Only user-facing string updates that remove "GeoAI scan" confusion are in scope.
- Database-backed preset/session/share/dashboard models. Those stay in `localStorage` per `docs/plan.md` YAGNI section.
- Adding a dedicated PDF dependency.

## Verification Matrix

All "fix checks" in this document must be demonstrated against at least one of the following commands. Tests pass under Windows cmd as `start.bat` uses.

- `npm run test:api -- --runInBand`
- `npm run test:web -- --runInBand`
- `npm run build -w @geoai/api`
- `npm run build -w @geoai/web`
- `.\.venv310\Scripts\python.exe -m py_compile geoai_backend.py scripts\property_embedding_service.py`
- Service smoke after `start.bat`:
  - `http://localhost:3000` (Next web responds with login or map shell).
  - `http://localhost:4000` (Nest API responds, `401` on an auth-gated endpoint counts as alive).
  - `http://localhost:5000/health` (Python backend returns healthy).
  - `http://localhost:9200/_cluster/health` (Elasticsearch returns `status` in `{green, yellow}`).

## Requirements

### Requirement 1: C1 Startup reliability of start.bat

**User Story:** As a local developer who has just opened Docker Desktop, I want `start.bat` to bring every required service up in a known order, probe each one for health, and only claim "ready" after all probes pass, so that I never have to guess whether an open `localhost:3000` page is actually wired to a working backend.

**Bug Condition `C1(X)`:** `X` is an invocation of `start.bat`. `C1(X)` holds when any of the following is true at launch time: a required toolchain is missing (`.venv310`/`.venv`/`python`, `node`, `npm`, `docker`, `docker compose`); a required port (`3000`, `4000`, `5000`, `9200`) is already bound by a process not owned by this repo; a per-service health probe fails (Elasticsearch `/_cluster/health`, Python `/health`, Nest API, Next web root); or a child `start "..." cmd /k ...` command has broken quoting.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C1(X)):

1.1 WHERE Docker Desktop is running AND `.venv310` exists AND all ports `3000`, `4000`, `5000`, `9200` are free, WHEN the operator runs `start.bat`, THEN the script SHALL bring up Elasticsearch, the Python backend, the Nest API, and the Next web in that order without operator intervention.

1.2 WHILE no service has failed a health probe, THE script SHALL continue to open one terminal window per service as it does today.

1.3 WHEN `start.bat` finishes a successful run, THE script SHALL print the URLs of all four services (`http://localhost:3000`, `http://localhost:4000`, `http://localhost:5000`, `http://localhost:9200`) AND SHALL print the literal readiness token `ALL SERVICES READY` only if every probe has passed.

1.4 WHERE `geoai_data/`, `.env`, `.venv`, and `.venv310` already exist, THE script SHALL NOT rename, move, or delete any of them.

Fix Acceptance Criteria (inputs where C1(X)):

1.5 IF Docker is not running OR `docker info` (called with a 10 second timeout) fails, THEN the script SHALL stop before starting any service AND SHALL print a message naming Docker Desktop as the missing prerequisite AND SHALL exit with a non-zero exit code.

1.6 IF `.venv310` is missing AND `.venv` is missing AND `python` is not on `PATH`, THEN the script SHALL stop before starting the Python backend AND SHALL print the list of candidates it tried, in the order tried.

1.7 IF `node` OR `npm` is missing, THEN the script SHALL stop before starting the Nest API or Next web AND SHALL print which tool is missing.

1.8 IF a required port is already bound, THEN the script SHALL identify the port AND SHALL check whether the bound process command line contains the literal substring `geoAI_web`; IF it does not contain `geoAI_web`, THEN the script SHALL stop without killing the process AND SHALL print guidance to free the port manually AND SHALL exit with a non-zero exit code.

1.9 WHEN each service is started, THE script SHALL perform a health probe against that service before starting the next one, polling every 2 seconds up to a 60 second per-service deadline: Elasticsearch `/_cluster/health` (pass when status is `green` or `yellow`), Python `/health` (pass when `200`), Nest API `/auth/me` (pass when `200` or `401`), Next web root (pass when `200` or a Next redirect).

1.10 IF any health probe fails, THEN the script SHALL NOT print the `ALL SERVICES READY` token AND SHALL print which probe failed AND the window title in which the operator can read the failing logs AND SHALL exit with a non-zero exit code.

1.11 THE child `start "..." cmd /k ...` lines SHALL use balanced quoting such that the window title does not collapse with the command, verifiable by a successful end-to-end smoke run on Windows cmd.

1.12 THE script SHALL use a shared internal `probe(service, port, path)` subroutine rather than inline duplicated `curl`/`powershell -command` blocks per service (DRY: probed in at least four places).

### Requirement 2: C2 Local-only data enforcement in the Python backend

**User Story:** As an operator running the app in local-data-only mode, I want every code path that would download, refresh, or overwrite Overture, GADM, or GeoTIFF data to be blocked at a single guard, so that cached local data cannot be silently corrupted or overwritten and so that the operator is never waiting on a network download that should never happen.

**Bug Condition `C2(X)`:** `X` is an invocation of one of: `refresh_danang_gpkg()`, `write_danang_gpkg()`, `download_overture_buildings()`, a GADM boundary download, a GeoTIFF cache-miss download, or an HTTP call to `/download-data`. `C2(X)` holds when `GEOAI_LOCAL_DATA_ONLY=true` at the time of the call.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C2(X)):

2.1 WHERE `GEOAI_LOCAL_DATA_ONLY` is unset or `false`, THE backend SHALL CONTINUE TO allow `refresh_danang_gpkg()`, `write_danang_gpkg()`, `download_overture_buildings()`, GADM downloads, GeoTIFF downloads, and `/download-data` to execute with their current behavior.

2.2 WHERE `GEOAI_LOCAL_DATA_ONLY=true`, THE backend SHALL CONTINUE TO serve read-only queries against the existing local Overture GeoPackage and cached GADM/GeoTIFF data with unchanged results.

2.3 WHERE `GEOAI_LOCAL_DATA_ONLY=true` AND a GADM boundary is missing locally, THE backend SHALL CONTINUE TO use the current bbox fallback behavior for ward/district clipping.

Fix Acceptance Criteria (inputs where C2(X)):

2.4 WHILE `GEOAI_LOCAL_DATA_ONLY=true`, WHEN `refresh_danang_gpkg()` is invoked, THEN the function SHALL return without performing any network call or local write AND SHALL emit exactly one log record that names the guard helper (`is_local_data_only`) and identifies the blocked operation (`refresh_danang_gpkg`).

2.5 WHILE `GEOAI_LOCAL_DATA_ONLY=true`, WHEN `write_danang_gpkg()` is invoked, THEN the function SHALL return without writing to `geoai_data/` AND SHALL emit exactly one log record that names the guard helper (`is_local_data_only`) and identifies the blocked operation (`write_danang_gpkg`).

2.6 WHILE `GEOAI_LOCAL_DATA_ONLY=true`, WHEN `download_overture_buildings()` is invoked from any code path (scan, preload, or admin), THEN the function SHALL return without performing any HTTP request to the Overture source AND SHALL emit exactly one log record identifying the blocked operation.

2.7 WHILE `GEOAI_LOCAL_DATA_ONLY=true`, WHEN a GADM download would be triggered by a cache miss, THEN the backend SHALL skip the download AND SHALL use the bbox fallback AND SHALL emit exactly one log record identifying the blocked operation.

2.8 WHILE `GEOAI_LOCAL_DATA_ONLY=true`, WHEN a GeoTIFF download would be triggered by a cache miss, THEN the backend SHALL skip the download AND the enclosing request SHALL complete without raising an unhandled exception AND SHALL return the same "raster unavailable" response shape the existing error path already uses.

2.9 WHILE `GEOAI_LOCAL_DATA_ONLY=true`, WHEN the HTTP client calls `POST /download-data` (or the current route path present in `geoai_backend.py`), THEN the endpoint SHALL respond with HTTP `409 Conflict` AND a JSON body containing a non-empty human-readable reason field that references the identifier `GEOAI_LOCAL_DATA_ONLY`.

2.10 THE guard SHALL be implemented as a single helper `is_local_data_only()` that reads the env flag once per call site (DRY: used at 3+ call sites across `refresh_danang_gpkg`, `write_danang_gpkg`, `download_overture_buildings`, GADM path, GeoTIFF path, and `/download-data` route).

2.11 THE Python compile check `py_compile geoai_backend.py scripts\property_embedding_service.py` SHALL pass after the change with exit code `0` and no output on stderr.

2.12 THE helper `is_local_data_only()` SHALL interpret the value of `GEOAI_LOCAL_DATA_ONLY` by trimming surrounding whitespace and lower-casing, returning `true` only when the resulting value equals the literal string `true`, so that two independent testers produce identical pass/fail results regardless of casing or padding.

### Requirement 3: C3 Scan mode coercion and response metadata

**User Story:** As an operator who has set `GEOAI_FORCE_OVERTURE_SCAN=true`, I want any scan request, including requests that pass `scanMode=geoai` from older UI clients or cached URLs, to be executed in Overture mode and to report that faithfully in the response, so that I cannot be misled by a UI that shows "GeoAI scan" while the backend actually ran Overture.

**Bug Condition `C3(X)`:** `X` is a scan request body received by the Python backend. `C3(X)` holds when `GEOAI_FORCE_OVERTURE_SCAN=true` AND `X.scanMode != "overture"` (including values such as `"geoai"`, `"geoai-disabled"`, or any other non-Overture mode).

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C3(X)):

3.1 WHERE `GEOAI_FORCE_OVERTURE_SCAN` is unset or `false`, THE backend SHALL CONTINUE TO honor the client-supplied `scanMode` value with its current behavior.

3.2 WHERE `GEOAI_FORCE_OVERTURE_SCAN=true` AND the client already sends `scanMode="overture"`, THE backend SHALL CONTINUE TO run Overture mode AND return `scanMode: "overture"` AND the same local Overture `dataSource` value it returns today.

3.3 WHERE `GEOAI_DEFAULT_SCAN_MODE=overture`, THE backend SHALL CONTINUE TO apply `overture` as the default when the client sends no `scanMode`.

Fix Acceptance Criteria (inputs where C3(X)):

3.4 WHEN `GEOAI_FORCE_OVERTURE_SCAN=true` AND the request has `scanMode="geoai"` OR `"geoai-disabled"` OR any non-Overture value, THEN the backend SHALL coerce the effective scan mode to `"overture"` before executing the scan.

3.5 WHEN a request is executed under coercion from 3.4, THE response JSON SHALL contain `scanMode: "overture"` AND the `dataSource` field SHALL equal the exact identifier the backend returns for an otherwise-identical request that was explicitly submitted with `scanMode="overture"` under the same configuration.

3.6 WHEN a request is executed under coercion from 3.4, THE backend SHALL NOT invoke any AI scan code path; AI scan branches SHALL remain in the codebase but marked as disabled by flag.

3.7 THE Next web route that proxies scan requests SHALL have a regression test that, under `GEOAI_FORCE_OVERTURE_SCAN=true`, sends a scan request with `scanMode="geoai"` AND asserts the response contains `scanMode: "overture"` AND a non-empty `dataSource` field.

3.8 THE coercion behavior SHALL be reversible at runtime: when `GEOAI_FORCE_OVERTURE_SCAN` is toggled from `true` back to `false` without code changes, the backend SHALL re-enter the client-honored path described in 3.1 on the next request.

### Requirement 4: C4 Web test regressions from Vietnamese UI

**User Story:** As a developer running `npm run test:web -- --runInBand`, I want web tests to match the actual Vietnamese UI strings shipped by `MeasurementToolbar`, `MapWrapperMeasurement`, and `LayerPanel`, so that the test suite is a reliable signal and the Vietnamization work is not blocked by stale English matchers.

**Bug Condition `C4(X)`:** `X` is the assertion set in `MeasurementToolbar.test.js`, `MapWrapperMeasurement.test.js`, or `LayerPanel.test.js` (paths as present in the repo; whichever files currently ship the failing assertions). `C4(X)` holds when a matcher in `X` targets an English string that no longer exists in the Vietnamese UI OR when a matcher targets a layer group or search term that no longer exists after Vietnamization.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C4(X)):

4.1 THE existing passing tests in the three affected files SHALL CONTINUE TO pass after the fix.

4.2 THE shipped Vietnamese UI strings SHALL CONTINUE TO appear unchanged in `MeasurementToolbar`, `MapWrapperMeasurement`, and `LayerPanel` unless a specific string is also updated by this spec under Requirement 12.

4.3 Tests outside `MeasurementToolbar.test.js`, `MapWrapperMeasurement.test.js`, and `LayerPanel.test.js` SHALL NOT be modified as part of this requirement.

Fix Acceptance Criteria (inputs where C4(X)):

4.4 WHEN `MeasurementToolbar.test.js` runs, THE test SHALL assert the presence of the Vietnamese labels `Đo khoảng cách`, `Đo diện tích`, `Hoàn tác`, `Xóa`, `Sao chép`, `Lưu`, and `Xuất JSON`.

4.5 WHEN `MeasurementToolbar.test.js` exercises the snap toggle, THE test SHALL target the Vietnamese label of the snap checkbox instead of an English regex such as `/snap/i`.

4.6 WHEN `MeasurementToolbar.test.js` exercises the permission-denied state, THE test SHALL assert whichever message the shipped UI currently renders in that state, consistently in the language of the UI.

4.7 WHEN `MapWrapperMeasurement.test.js` asserts the measurement section heading or trigger, THE test SHALL use the current Vietnamese label instead of `"Measurement tools"`.

4.8 IF a measurement section is collapsed by default in `MapWrapperMeasurement.test.js`, THEN the test SHALL expand or click the trigger before asserting the inner buttons.

4.9 WHEN `LayerPanel.test.js` asserts group labels, THE test SHALL match the current Vietnamese group labels.

4.10 WHEN `LayerPanel.test.js` types into the layer search box, THE test SHALL use a query that matches at least one shipped layer; the string `"runtime"` SHALL be replaced with a query that exists in the current layer set.

4.11 THE three tests SHALL share a small Vietnamese-label helper module (for example `vnLabel()` / `assertMeasurementButtons()`) so that the Vietnamese strings are defined once (DRY: used in 3+ places).

4.12 WHEN `npm run test:web -- --runInBand` runs, the three previously-red tests SHALL pass and the overall web suite SHALL be green, subject to Requirements 5 and 6 also being satisfied.

### Requirement 5: C5 Share-route fixture expiry

**User Story:** As a developer running the web test suite in 2026-Q2 and later, I want `apps/web/app/share/map/route.test.js` to not depend on a hardcoded expiry date of `2026-05-10`, so that my suite does not start failing purely because calendar time has advanced past the fixture.

**Bug Condition `C5(X)`:** `X` is a run of `apps/web/app/share/map/route.test.js`. `C5(X)` holds when the test fixture encodes `expiresAt = 2026-05-10` AND the test executes on a real wall-clock date after `2026-05-10`, so the share route redirects with `shareError=expired` and the assertion expecting a successful share render fails.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C5(X)):

5.1 THE share route SHALL CONTINUE TO redirect with `shareError=expired` when a share payload's `expiresAt` is in the past at the time the request is handled.

5.2 Tests that intentionally cover the expired-share path SHALL CONTINUE TO pass with their own expired fixtures.

5.3 THE share-route production behavior SHALL NOT be changed by this requirement; only the test fixture and, if needed, an injectable clock boundary are in scope.

Fix Acceptance Criteria (inputs where C5(X)):

5.4 WHEN `apps/web/app/share/map/route.test.js` runs, THE test SHALL either (a) inject a clock seam into the route handler and set "now" to a fixed instant at least 24 hours before the fixture's `expiresAt`, OR (b) compute the fixture's `expiresAt` at test-setup time as `now + N days` where `7 ≤ N ≤ 365`.

5.5 THE chosen approach from 5.4 SHALL be documented by a comment co-located with the fixture or seam that names the rationale AND references `C5` so that a future reader sees why the date is computed rather than hardcoded.

5.6 THE test SHALL pass regardless of the wall-clock date of the machine running it, verifiable by running `npm run test:web -- --runInBand` on any date from `2026-05-11` through `2035-12-31` with exit code `0` and zero fixture-expiry failures.

5.7 THE "Export & sharing" feature bucket in `docs/plan.md` remains Foundation Only per `docs/backlog-progress.md`; this requirement ONLY unblocks the test suite and SHALL NOT expand the shipping scope of Export & sharing.

### Requirement 6: C6 DashboardModule must import AuthModule

**User Story:** As a developer wiring Nest modules, I want `DashboardModule` to explicitly import `AuthModule` so that guard dependencies resolve at boot, and I want a regression test to prevent this wiring from silently disappearing again.

**Bug Condition `C6(X)`:** `X` is the Nest DI container boot for `DashboardModule`. `C6(X)` holds when `AuthModule` is not in `imports` of `DashboardModule` AND a guard consumed by dashboard routes depends on a provider exported by `AuthModule`, so Nest throws at boot or at the first request.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C6(X)):

6.1 THE existing dashboard endpoints SHALL CONTINUE TO return the same shape they return today for authenticated callers.

6.2 Non-dashboard modules' imports SHALL NOT be modified.

Fix Acceptance Criteria (inputs where C6(X)):

6.3 `DashboardModule` SHALL declare `AuthModule` in its `imports` such that guard injection resolves at boot.

6.4 A new regression test SHALL assert that instantiating `DashboardModule` via a Nest testing module succeeds AND that the guard used by dashboard routes resolves without `UnknownDependenciesException`.

6.5 WHEN `npm run test:api -- --runInBand` runs, the regression test SHALL pass.

6.6 WHEN `npm run build -w @geoai/api` runs, the build SHALL succeed.

### Requirement 7: C7 Session refresh-token jti collision in PrismaSessionRepository.create

**User Story:** As a developer running the session/refresh tests and the auth API in local dev, I want refresh-token creation to not collide on a unique constraint due to a fixed mocked token, and I want the production path to be resilient if two creates race on the same `jti`, so that login flows are stable under both tests and real use.

**Bug Condition `C7(X)`:** `X` is a call to `PrismaSessionRepository.create({ ..., jti })`. `C7(X)` holds when either (a) a unit test supplies a fixed `jti` that already exists in the test database from a previous `create`, or (b) two concurrent calls in production pass the same `jti` due to a coarse generator or clock.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C7(X)):

7.1 THE existing behavior of `PrismaSessionRepository.create` for a unique `jti` SHALL CONTINUE TO succeed and return the same shape it returns today.

7.2 THE existing auth flow SHALL CONTINUE TO invalidate old sessions on refresh according to current semantics.

7.3 Prisma schema SHALL NOT be changed by this requirement.

Fix Acceptance Criteria (inputs where C7(X)):

7.4 THE unit tests covering `PrismaSessionRepository.create` SHALL NOT mock a fixed refresh-token `jti` value across calls that are expected to be distinct; each test case that creates more than one session SHALL use a unique `jti` per create.

7.5 IF a race on `jti` is still possible under production concurrency, THEN `PrismaSessionRepository.create` SHALL implement a documented retry-once-or-upsert policy on the unique-constraint error AND that policy SHALL be covered by a test that simulates the duplicate error.

7.6 WHEN `npm run test:api -- --runInBand` runs, the session tests SHALL pass without relying on ordering of previously-failed tests.

### Requirement 8: C8 Prisma NAPI errors on 4 GB SQLite during dashboard aggregation

**User Story:** As an operator on a local machine with a 4 GB SQLite property store, I want the dashboard aggregation endpoints to compute their numbers without Prisma NAPI failures and without loading full geometry, attributes, or embedding into memory, so that the dashboard is usable and does not take down the Nest process.

**Bug Condition `C8(X)`:** `X` is a dashboard aggregation request handled by `DashboardService`. `C8(X)` holds when the aggregation path goes through Prisma in a way that materializes `geometry` / `attributes` / `embedding` rows against a multi-GB SQLite file, causing Prisma NAPI failures or process instability.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C8(X)):

8.1 THE public response shape of dashboard aggregation endpoints SHALL CONTINUE TO match what the web UI consumes today (KPI summary, buckets, trend, filters).

8.2 Callers OUTSIDE dashboard aggregation (list, search, detail) SHALL retain their current Prisma-based path unless covered by Requirement 9.

8.3 THE Prisma schema and the SQLite file layout SHALL NOT be changed by this requirement.

Fix Acceptance Criteria (inputs where C8(X)):

8.4 WHEN `DashboardService` performs aggregation against the local SQLite property store, THE service SHALL use `BetterSqliteService` (or the equivalent non-Prisma adapter already present in the codebase) for the aggregation SQL.

8.5 THE aggregation queries SHALL NOT `SELECT` or deserialize the columns `geometry`, `attributes`, or `embedding`; they SHALL only read the count and bucket columns they actually aggregate.

8.6 A new unit test for `DashboardService` SHALL verify the aggregation result for a seeded fixture AND SHALL verify that heavy columns are not requested, for example by asserting on the SQL shape or via a spy on the adapter.

8.7 WHEN `npm run test:api -- --runInBand` runs on the local environment, the dashboard tests SHALL pass without Prisma NAPI errors.

8.8 WHEN `npm run build -w @geoai/api` runs, the build SHALL succeed.

### Requirement 9: C9 /api/properties list is slow due to heavy default projection

**User Story:** As a web user opening a page that calls `/api/properties?limit=3`, I want the response to come back in well under a second, because the list does not need geometry, attributes, or embedding, and the UI pulls those fields on demand for detail views.

**Bug Condition `C9(X)`:** `X` is a request to `/api/properties` for list or search (including `limit=3`) handled by `PropertiesService`. `C9(X)` holds when the default Prisma select pulls `geometry`, `attributes`, or `embedding`, causing a 5 to 15 second response against the local SQLite dataset.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C9(X)):

9.1 THE properties detail endpoint SHALL CONTINUE TO return `geometry`, `attributes`, and `embedding` exactly as today when requested.

9.2 THE properties list or search response SHALL CONTINUE TO include every field that the current web UI reads from the list response, for example `id`, `code`, `type`, `status`, `wardId`, timestamps, and any lightweight summary fields used by the list UI.

9.3 Export endpoints that explicitly request heavy fields SHALL CONTINUE TO include them.

Fix Acceptance Criteria (inputs where C9(X)):

9.4 THE default Prisma `select` used by `/api/properties` list and search SHALL exclude `geometry`, `attributes`, and `embedding`.

9.5 A shared helper `selectLightPropertyFields()` (or equivalently-named export) SHALL define the light projection once AND SHALL be reused by list, search, and any export path that does not require heavy fields (DRY: used in 3+ places).

9.6 Callers that need heavy fields SHALL opt in explicitly, for example via a method parameter or a distinct heavy-projection helper.

9.7 A regression test SHALL assert that the list response for a seeded fixture contains every field the UI needs AND does not contain `geometry`, `attributes`, or `embedding` when not requested.

9.8 WHEN `npm run test:api -- --runInBand` runs, the properties tests SHALL pass.

9.9 WHEN a smoke call is made to `/api/properties?limit=3` during the smoke run, the response SHALL return well under the current 5 to 15 second range; the test plan SHALL include this as a manual smoke check documented in the test output notes.

### Requirement 10: C10 Repo cleanup and .gitignore coverage

**User Story:** As a developer running `git status`, I want a clean working tree where transient log and build artifacts are ignored rather than shown as untracked noise, and I want preserved data paths to stay safe.

**Bug Condition `C10(X)`:** `X` is a `git status` call at the repo root. `C10(X)` holds when untracked entries include `.tmp-*.log`, `*-dev.log`, `embedding-service*.log`, `.next/`, or `scratch/` artifacts that have no reason to be tracked.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C10(X)):

10.1 `geoai_data/` SHALL CONTINUE TO exist with its current contents unchanged.

10.2 `.env`, `.venv`, and `.venv310` SHALL CONTINUE TO exist AND SHALL NOT be modified or deleted by this requirement.

10.3 Tracked source files SHALL NOT be deleted or moved by this requirement.

Fix Acceptance Criteria (inputs where C10(X)):

10.4 `.gitignore` SHALL include patterns that cover `.tmp-*.log`, `*-dev.log`, `embedding-service*.log`, `.next/`, and `scratch/`.

10.5 `.gitignore` SHALL explicitly preserve (not ignore) `geoai_data/`, `.env`, and `.venv*` paths used by the project.

10.6 Only untracked or generated artifacts matching the patterns in 10.4 SHALL be removed from the working tree; `git clean -fdX` or an explicit per-file removal SHALL be the method of record.

10.7 After cleanup, `git status --short` SHALL NOT list entries that match the patterns in 10.4.

### Requirement 11: C11 Documentation alignment

**User Story:** As a new operator reading `README.md`, `STARTUP_GUIDE.md`, and `BACKEND_COMMANDS.md`, I want the docs to describe the single supported startup path (Docker Desktop, then `start.bat`, then `localhost:3000`) and the local-only data mode, and I want obsolete commands removed, so that I am never misled into running scripts that no longer apply.

**Bug Condition `C11(X)`:** `X` is a human reader following the current docs. `C11(X)` holds when the docs reference commands, scripts, or modes that do not match the current behavior, for example recommending `start_geoai.bat`, omitting the local-only mode, or listing obsolete backend commands.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C11(X)):

11.1 Doc files outside `README.md`, `STARTUP_GUIDE.md`, and `BACKEND_COMMANDS.md` SHALL NOT be modified by this requirement.

11.2 Historical notes that remain accurate SHALL CONTINUE TO appear unchanged.

Fix Acceptance Criteria (inputs where C11(X)):

11.3 `README.md` AND `STARTUP_GUIDE.md` SHALL state the startup path in the order Docker Desktop, then `start.bat`, then `http://localhost:3000`.

11.4 `README.md` AND `STARTUP_GUIDE.md` SHALL state that the default runtime mode is local-only (no Overture/GADM/GeoTIFF downloads) AND SHALL describe how to re-enable the AI scan path later via env flags without deleting any code.

11.5 `README.md` AND `STARTUP_GUIDE.md` SHALL NOT recommend `start_geoai.bat` as the primary entrypoint; IF the file is kept for reference, THEN the docs SHALL mark it as legacy.

11.6 `BACKEND_COMMANDS.md` SHALL contain only commands that apply to the current operating mode; obsolete commands SHALL be removed or moved under a clearly labeled legacy section.

11.7 THE verification commands in the Verification Matrix section of this spec SHALL appear in `BACKEND_COMMANDS.md` so a developer can copy-paste them.

### Requirement 12: C12 Safe refactors with no behavior change

**User Story:** As a maintainer coming back to this code in six months, I want the runtime flags parsed in one clearly-named block, the local-only guard extracted into a single helper, the `geoai-disabled` UI option represented by a named constant, and user-facing strings that stop confusing "GeoAI scan" with the actual Overture result, so that the intent of the code is obvious without reading every branch.

**Bug Condition `C12(X)`:** `X` is any code site that currently parses `GEOAI_LOCAL_DATA_ONLY`, `GEOAI_FORCE_OVERTURE_SCAN`, `GEOAI_DEFAULT_SCAN_MODE`, or `GEOAI_SKIP_STARTUP_PRELOAD` inline instead of reading from a central runtime-flags block; OR checks `os.getenv("GEOAI_LOCAL_DATA_ONLY")` directly instead of calling a single helper; OR hardcodes the string `"geoai-disabled"` in the UI option or ships it as a scan mode value; OR displays "GeoAI scan" in operator-facing strings where the effective source is local Overture.

#### Acceptance Criteria

Preservation Acceptance Criteria (inputs where NOT C12(X)):

12.1 THE externally-observable behavior of every entry point SHALL CONTINUE TO match what Requirements 1 through 11 have locked down; this requirement SHALL NOT change behavior beyond those requirements.

12.2 `geoai_backend.py` SHALL NOT be split into multiple modules; only an internal `Runtime flags` block and an `is_local_data_only()` helper SHALL be introduced.

12.3 THE UI layout SHALL NOT be rewritten; only user-facing string updates and the extraction of a `geoai-disabled` constant are in scope.

Fix Acceptance Criteria (inputs where C12(X)):

12.4 THE Python backend SHALL expose a single `Runtime flags` block (for example a small dataclass, a `SimpleNamespace`, or a typed module-level section) that reads `GEOAI_LOCAL_DATA_ONLY`, `GEOAI_FORCE_OVERTURE_SCAN`, `GEOAI_DEFAULT_SCAN_MODE`, AND `GEOAI_SKIP_STARTUP_PRELOAD` once at startup.

12.5 `is_local_data_only()` SHALL be the single helper used by all guards required by Requirement 2 (DRY: used in 3+ places).

12.6 THE web UI SHALL define a named constant (for example `SCAN_MODE_DISABLED`) for the `geoai-disabled` option AND SHALL NOT inline the literal string at its call sites.

12.7 THE web UI SHALL guarantee that `geoai-disabled` is NOT sent as `scanMode` in any scan request; IF the user selects the disabled option, THEN the request SHALL send `scanMode="overture"` OR SHALL be prevented from firing.

12.8 A test SHALL assert 12.7 by dispatching a scan from the UI in the disabled-option state AND asserting that the outgoing request body has `scanMode="overture"` OR that no request is dispatched.

12.9 Operator-facing strings that today say "GeoAI scan" WHEN the effective mode is Overture SHALL be updated to a term that does not imply AI inference (for example "Overture scan" or "Kết quả quét Overture"), so that the UI label matches the backend `scanMode`.

12.10 WHEN `npm run test:api -- --runInBand`, `npm run test:web -- --runInBand`, `npm run build -w @geoai/api`, `npm run build -w @geoai/web`, AND `.\.venv310\Scripts\python.exe -m py_compile geoai_backend.py scripts\property_embedding_service.py` all run, every command SHALL complete successfully on the local environment.
