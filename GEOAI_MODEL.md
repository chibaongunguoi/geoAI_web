# GeoAI Runtime Model

## Overview

The application supports two scan modes:

- `geoai`: crops cached district GeoTIFF imagery to the selected bbox and runs GeoAI detection during the request.
- `overture`: reads local vector building data from the Da Nang Overture GeoPackage.

The AI model used by the app is `geoai.extract.BuildingFootprintExtractor` from the `geoai-py` package. The repo does not expose a more specific internal architecture name than that wrapper.

## GeoAI Flow

1. The user draws a rectangle on the map.
2. The frontend sends the rectangle bbox, selected administrative area, and scan mode to `/api/analyze`.
3. The backend intersects the bbox with the selected administrative boundary and enforces the 25 hectare limit.
4. For each overlapping district, the backend loads the cached district GeoTIFF from `geoai_data/geotiff_cache/`.
5. The backend crops the GeoTIFF to the valid geometry inside the selected area.
6. The backend runs `BuildingFootprintExtractor.process_raster(...)` on that crop.
7. Detected building polygons are clipped back to the selected geometry, merged, deduplicated, and returned as map boxes and statistics.

## Startup Behavior

On startup, the backend prepares:

- GADM administrative boundaries for Da Nang
- Overture GeoPackage data when enabled
- district GeoTIFF cache

By default it does not precompute AI footprint files at startup.

Recommended environment defaults:

```bash
GEOAI_PRELOAD_AI_FOOTPRINTS=false
GEOAI_ALLOW_RUNTIME_AI_EXTRACTION=true
```

## Response Metadata

Successful `geoai` scans return:

- `scanMode: "geoai"`
- `modelName: "BuildingFootprintExtractor"`
- `dataSource: "Runtime GeoTIFF crop + GeoAI BuildingFootprintExtractor"`

Successful `overture` scans return:

- `scanMode: "overture"`
- `dataSource: "Overture Maps local GeoPackage"`

## Accuracy Notes

`geoai` mode is more specific to the user-selected bbox because inference runs after the scan request. Accuracy still depends on:

- GeoTIFF image quality and zoom
- confidence threshold
- district boundary clipping
- how well `BuildingFootprintExtractor` matches local roof patterns

## Fallback

If runtime AI extraction fails, the backend falls back to image-characteristic analysis so the UI still receives a response with a lower-confidence source label.
