# SQLite Migration Handoff

This document summarizes the work completed so far on the Phase 0: SQLite Migration and outlines the next steps for the incoming developer.

## What was done
1. **Prisma and SQLite Setup:** 
   - We completely removed the Neon PostgreSQL setup to bypass the 512MB free-tier limit.
   - We switched the Prisma provider to `sqlite` and installed `better-sqlite3` to handle complex raw SQL queries that Prisma struggles with.
   - The database is now located at `geoai_data/geoai.db`, which is accessible from both the Node.js API and the Python scripts.
   - We updated the Prisma `seed.ts` file to use `upsert` in a loop because SQLite doesn't support `createMany` with `skipDuplicates`.
2. **Raw SQL Rewrites:**
   - In `properties.service.ts`, the density grid queries used Postgres-specific syntax (`FLOOR()::INTEGER`, `::DOUBLE PRECISION`, etc.). 
   - These were rewritten to be SQLite-compatible using `CAST(x / ? AS INTEGER)`.
   - We injected a `BetterSqliteService` to run these raw queries safely and efficiently.

## Difficulties Faced
- **Jest Mock Argument Matching:** The hardest part of this phase was fixing the unit tests (`properties.service.spec.ts`). When switching to `better-sqlite3`, we changed from `$queryRawUnsafe` to `sqlite.all()`. 
- `sqlite.all` takes all query parameters as individual arguments. Our test used `expect.anything()` to mock these parameter assertions. Because the rewritten SQLite query takes exactly 12 arguments after the SQL string (1 source + 4 terms + 6 grid sizes + 1 limit), we had to manually count and provide exactly 12 `expect.anything()` calls in our Jest mock assertion `expect(sqlite.all).toHaveBeenCalledWith(expect.stringContaining("CAST"), ...)`. If the count is off, Jest fails with a cryptic argument mismatch error.

## Next Steps (TASK-002 and TASK-003)
The backend API is now fully running on SQLite and all tests are passing. The next person should:
1. Update the Python script `scripts/import_danang_overture_buildings.py` to use `sqlite3` instead of `psycopg2`. 
   - **Important:** Ensure it inserts data in small batches (e.g., 1000 rows per batch) and commits after each batch. 
   - If a row is missing data, insert `NULL`. Do not fake columns.
2. Update the Elasticsearch indexing script `scripts/index_building_properties.py` to read from the SQLite db.
3. Fix up `scripts/test_import_danang_overture_buildings.py` unit tests for SQLite.
4. Run the data import to populate the local `geoai_data/geoai.db` with the full 424k+ rows of Da Nang building data.

Good luck!
