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
