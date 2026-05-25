# Backend Commands

Operating commands that apply to the current local-only runtime. If you need something not listed here, it probably belongs in a feature spec, not in this file.

## Full stack (recommended)

```cmd
.\start.bat
```

Brings up Elasticsearch, the Python GeoAI backend, the NestJS API, and the Next.js web. Prints `ALL SERVICES READY` only when every per-service health probe has passed. See `STARTUP_GUIDE.md` for details.

## Verification matrix

```cmd
npm run test:api -- --runInBand
npm run test:web -- --runInBand
npm run build -w @geoai/api
npm run build -w @geoai/web
.\.venv310\Scripts\python.exe -m py_compile geoai_backend.py scripts\property_embedding_service.py
```

## Rebuild Elasticsearch property index

With Elasticsearch and the embedding service running:

```cmd
.\scripts\reindex_elasticsearch_properties.bat
```

For non-interactive use:

```cmd
.\scripts\reindex_elasticsearch_properties.bat --yes
```

This deletes and recreates `building_properties_v1`, then indexes every non-deleted
`BuildingProperty` row from the database configured in `apps/api/.env`.

For a faster semantic-search test, rebuild only one district:

```powershell
.\scripts\reindex_elasticsearch_properties.bat --yes --district "Hải Châu"
```

Shortcut for Hải Châu buildings:

```powershell
.\scripts\reindex_hai_chau_buildings.bat
```

or:

```powershell
.\scripts\reindex_elasticsearch_properties.bat --yes --district "Liên Chiểu"
```

To prefer GPU embeddings, start the embedding service with:

```cmd
set EMBEDDING_DEVICE=cuda
set USE_ELASTICSEARCH=1
.\start.bat
```

Or in PowerShell:

```powershell
$env:EMBEDDING_DEVICE="cuda"
$env:USE_ELASTICSEARCH="1"
.\start.bat
```

Check `http://localhost:5055/health`; it should report `"device":"cuda"`
when Torch can see the GPU.

## Import Overture Places POIs

Import Da Nang POIs into the local `Place` table:

```cmd
.\scripts\import_danang_overture_places.bat
```

Dry run:

```cmd
.\scripts\import_danang_overture_places.bat --dry-run
```

Optional category filter:

```cmd
.\scripts\import_danang_overture_places.bat --category restaurant --category cafe
```

## Convert POIs into managed assets

After POIs are in `Place`, materialize them as real `BuildingProperty` assets:

```bat
.\scripts\convert_pois_to_assets.bat --dry-run --district "Hải Châu"
.\scripts\convert_pois_to_assets.bat --district "Hải Châu"
```

Limit to specific POI categories:

```bat
.\scripts\convert_pois_to_assets.bat --category cafe --category coffee_shop
```

The script is idempotent by `overtureId`: existing assets are skipped unless
`--update-existing` is passed. POI category is stored as `propertyType`
(`cafe`, `coffee_shop`, `restaurant`, etc.) so the Assets page can filter them.

## Prepare Hai Chau semantic data

With Elasticsearch and the embedding service running:

```cmd
.\scripts\prepare_hai_chau_semantic_data.bat --yes
```

This skips the Overture Places import when `Place` already has data, then
rebuilds the Hải Châu slices for:

- `building_properties_v1` via `scripts\reindex_elasticsearch_properties.bat`
- `places_v1` via `scripts\reindex_elasticsearch_places.bat`

To rebuild only the POI index:

```cmd
.\scripts\reindex_elasticsearch_places.bat --yes --district "Hai Chau"
```

The POI indexer defaults to `EMBEDDING_BATCH_SIZE=512` and
`EMBEDDING_ENCODE_BATCH_SIZE=512`. The script itself is single-process; CPU/GPU
selection happens in `scripts\property_embedding_service.py`.

For GPU:

```powershell
$env:EMBEDDING_DEVICE="cuda"
$env:EMBEDDING_BATCH_SIZE="512"
$env:EMBEDDING_ENCODE_BATCH_SIZE="512"
.\start.bat
.\scripts\reindex_elasticsearch_places.bat --yes --district "Hai Chau"
```

If the GPU runs out of memory, lower both batch values to `256`.

## Service smoke URLs

- `http://localhost:3000` — Next web (login or map shell).
- `http://localhost:4000/auth/me` — NestJS API (`401` is alive).
- `http://localhost:5000/health` — Python GeoAI backend.
- `http://localhost:9200/_cluster/health` — Elasticsearch.

## Runtime flags

Set before running `start.bat` to alter behavior:

| Variable              | Effect                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| `USE_ELASTICSEARCH=1` | Point the Nest API semantic search provider at Elasticsearch.          |

All other runtime flags are configured by `start.bat` itself. See `STARTUP_GUIDE.md` for the full list.
