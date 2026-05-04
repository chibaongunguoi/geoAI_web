# Real GeoAI Integration

## Current State

- `overture` mode stays unchanged and reads local vector data from the Da Nang Overture GeoPackage.
- `geoai` mode now runs AI inference after the user finishes drawing a scan area.
- The backend uses cached district GeoTIFF files as the raster source for runtime inference.
- The model entrypoint used by the app is `geoai.extract.BuildingFootprintExtractor`.

## Runtime GeoAI Request

When a user scans with `geoai` mode:

1. The frontend sends the bbox and the selected administrative area.
2. The backend clips the bbox to the valid district geometry.
3. The backend crops the district GeoTIFF cache to the valid geometry.
4. The backend runs `BuildingFootprintExtractor.process_raster(...)` on the crop.
5. The backend clips and deduplicates detected polygons, calculates stats, and caches the result for the same bbox.

This keeps `geoai` aligned with the user-selected area instead of reusing precomputed district-wide AI footprints.

## Startup Expectations

Default startup now prepares:

- GADM boundaries
- Da Nang Overture GeoPackage when enabled, downloading the first local copy when it is missing
- district GeoTIFF cache

Default startup no longer needs to create new files under `geoai_data/ai_scans/`.

Generated data is intentionally not committed. A fresh clone with internet access can recreate runtime data under `geoai_data/`; set `GEOAI_DOWNLOAD_OVERTURE_IF_MISSING=false` if you want startup to skip the initial Overture download.

Fine-tuned checkpoint lookup:

1. `GEOAI_MODEL_PATH` when explicitly set.
2. `GEOAI_FINETUNED_MODEL_PATH` when set and the file exists.
3. `geoai_data/models/danang_urban_z18_maskrcnn/best_model.pth`.
4. `geoai_data/models/best_model.pth`.
5. Base model from `GEOAI_BASE_MODEL_PATH`, defaulting to `building_footprints_usa.pth`.

After Kaggle training, extract the zip and place `best_model.pth` at `geoai_data/models/danang_urban_z18_maskrcnn/best_model.pth` to use the fine-tuned model automatically.

Suggested environment values:

```bash
GEOAI_PRELOAD_AI_FOOTPRINTS=false
GEOAI_ALLOW_RUNTIME_AI_EXTRACTION=true
```

## Verification Checklist

- Start the backend and confirm it preloads boundaries and GeoTIFF cache without precomputing district AI footprint files.
- Run a `geoai` scan and confirm the response includes:
  - `scanMode: "geoai"`
  - `modelName: "BuildingFootprintExtractor"`
  - `dataSource: "Runtime GeoTIFF crop + GeoAI BuildingFootprintExtractor"`
- Repeat the same scan and confirm the bbox-level cache is reused.
- Run an `overture` scan and confirm its behavior is unchanged.

## Notes

The repo does not identify a lower-level architecture name such as ResNet or Mask R-CNN. The application only instantiates the `BuildingFootprintExtractor` wrapper provided by `geoai-py`.
