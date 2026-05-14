# Startup Guide

The only supported local-dev entrypoint is `start.bat`.

## Prerequisites

1. Install Docker Desktop and make sure it is running.
2. Install Node.js (LTS) and Python 3.10 (matching `.venv310`).
3. From this folder, create the Python venv once: `python -m venv .venv310` then `.\.venv310\Scripts\pip install -r requirements.txt`.

## Run

```cmd
.\start.bat
```

When `start.bat` prints `ALL SERVICES READY`, open `http://localhost:3000`.

## What start.bat does

1. Verifies `node`, `python` (via `.venv310` > `.venv` > `python`), `docker`, and `docker info`.
2. Warns if any of ports `3000`, `4000`, `5000`, `9200` are already bound.
3. Runs `npm install` (if needed) and `npm run prisma:generate`.
4. Starts Elasticsearch with `docker compose -f docker-compose.search.yml up -d` and waits on `/_cluster/health`.
5. Starts the Python GeoAI backend on `:5000` in local-data-only mode and waits on `/health`.
6. Starts the NestJS API on `:4000` and waits on `/auth/me` (treats `200` or `401` as alive).
7. Starts the Next.js web on `:3000` and waits for the root to respond.

If any probe fails within its deadline, the script prints a warning naming the failing service and does not print `ALL SERVICES READY`.

## Default runtime mode: local Overture only

`start.bat` sets these env vars for the Python backend so nothing is downloaded at runtime:

| Variable                              | Default in start.bat | Meaning                                                        |
| ------------------------------------- | -------------------- | -------------------------------------------------------------- |
| `GEOAI_LOCAL_DATA_ONLY`               | `true`               | No Overture/GADM/GeoTIFF downloads, no GeoPackage rewrites.    |
| `GEOAI_FORCE_OVERTURE_SCAN`           | `true`               | Any `scanMode` is coerced to `overture` before scanning.       |
| `GEOAI_DEFAULT_SCAN_MODE`             | `overture`           | Default mode when the client sends no `scanMode`.              |
| `GEOAI_ALLOW_RUNTIME_AI_EXTRACTION`   | `false`              | Runtime AI extraction is disabled.                             |
| `GEOAI_DOWNLOAD_OVERTURE_IF_MISSING`  | `false`              | Never lazy-download Overture.                                  |
| `GEOAI_SKIP_STARTUP_PRELOAD`          | `true`               | Skip heavy preload on boot.                                    |
| `GEOAI_PRELOAD_OVERTURE`              | `false`              | No Overture preload.                                           |
| `GEOAI_PRELOAD_GEOTIFFS`              | `false`              | No GeoTIFF preload.                                            |

To re-enable the AI scan path for an experiment, unset `GEOAI_FORCE_OVERTURE_SCAN` and `GEOAI_ALLOW_RUNTIME_AI_EXTRACTION=true`, then restart the backend. The AI code itself is left in `geoai_backend.py`, just flag-disabled.

## Optional: Elasticsearch semantic search

Elasticsearch runs as part of `start.bat`, but the Nest API only uses it as the search provider if you opt in:

```cmd
set USE_ELASTICSEARCH=1
.\start.bat
```

Without `USE_ELASTICSEARCH=1`, the API serves search from the SQLite/default provider.

## Troubleshooting

- **Docker Desktop not running** — `start.bat` exits early and tells you to start Docker.
- **A port is already listening** — `start.bat` prints which ports and asks you to close the matching process.
- **A probe warning appears** — the named service window has the actual error log. Read that window first.
- **UI spins forever** — check the `GeoAI Python Backend :5000`, `GeoAI NestJS API :4000`, and `GeoAI Web Frontend :3000` windows in order.

## Notes

- `geoai_data/`, `.env`, `.venv`, and `.venv310` are never touched by `start.bat`.
- Older scripts (`start_geoai.bat`, `start_backend.bat`, `start_frontend_only.bat`, and their `.sh` variants) have been removed. Use `start.bat`.
