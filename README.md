# GeoAI Web - Satellite Image Analysis with AI

Interactive web application for analyzing satellite images using GeoAI model.

## 🚀 Quick Start

### Windows (Easiest)

```bash
start_geoai.bat
```

### Linux/Mac

```bash
chmod +x start_geoai.sh
./start_geoai.sh
```

**That's it! Browser will open at http://localhost:3000**

---

## 📋 Requirements

- **Python 3.8+**
- **Node.js 16+**
- **Ports:** 3000 (frontend), 5000 (backend)

---

## ✨ Features

- 🗺️ Interactive satellite map with Leaflet.js
- 📍 Draw rectangle area and capture image
- 🤖 **Real GeoAI Model** - Runs GeoAI building detection on demand after you draw a scan area
- 🏢 Real building footprints, count, and area calculation
- 🟥 Red boxes for detected buildings
- 🧭 District-based processing for Hai Chau, Thanh Khe, Son Tra, Ngu Hanh Son, Lien Chieu, Cam Le, and Hoa Vang
- 🧩 GADM administrative boundaries for clipping scans to the selected district
- 📐 Valid scan area is limited to 25 hectares after clipping to the selected district
- 💾 Smart caching - fast results for same areas
- 📈 Real-time results with detailed statistics
- 🔄 Instant processing and display

---

## 🚀 What's New: Real GeoAI Model

**No more random data!** The application now uses cached district GeoTIFF imagery with GeoAI's `BuildingFootprintExtractor` for on-demand building detection.

When you draw a rectangle:

1. ✅ Clips the selected area to the chosen district and checks that the valid part is no larger than 25 hectares
2. ✅ Loads GADM administrative boundaries and clips the bbox to the selected district
3. ✅ Uses the preloaded zone GeoTIFF cache as the raster source for runtime AI detection
4. ✅ Runs GeoAI detection only after the scan request is sent
5. ✅ Clips all detected/vector objects to the part of the bbox inside those zones
6. ✅ Draws building boxes on the map

**[📚 See GEOAI_MODEL.md for technical details](GEOAI_MODEL.md)**

---

## 🔧 Detailed Installation

The easiest path is still `start_geoai.bat` on Windows or `./start_geoai.sh` on Linux/Mac. Use the steps below when setting up a new machine or when you want to run backend/frontend separately.

### 1. Install system requirements

Install these first:

- Python 3.8 or newer
- Node.js 16 or newer
- Git

Check versions:

```bash
python --version
node --version
npm --version
git --version
```

On Linux/Mac, use `python3 --version` if `python` is not available.

### 2. Clone and enter the project

```bash
git clone <repo-url>
cd geoAI_web
```

If you already have the project folder, just open a terminal in the project root.

### 3. Create and activate a Python virtual environment

Windows PowerShell:

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Windows Command Prompt:

```bash
python -m venv .venv
.\.venv\Scripts\activate.bat
```

Linux/Mac:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Install Python dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

The backend uses GeoAI, GeoPandas, Shapely, Flask, and image-processing packages. Installation can take a while because geospatial packages are large.

### 5. Install frontend dependencies

```bash
npm install
```

### 6. Configure environment variables

Create a `.env` file in the project root when you need custom settings:

```bash
GEOAI_DANANG_BBOX=107.82,15.88,108.35,16.20
GEOAI_BACKEND_URL=http://localhost:5000
GEOAI_TILE_SOURCE=Satellite
GEOAI_TILE_ZOOM=18
GEOAI_HOAVANG_TILE_ZOOM=16
GEOAI_CONFIDENCE_THRESHOLD=0.5
GEOAI_BATCH_SIZE=1
GEOAI_DEVICE=cpu
GEOAI_PRELOAD_AI_FOOTPRINTS=false
GEOAI_ALLOW_RUNTIME_AI_EXTRACTION=true
```

`GEOAI_DANANG_BBOX` controls the broad Da Nang map extent. `GEOAI_BACKEND_URL` is used by the Next.js API route when forwarding scan requests to Flask.

`GEOAI_TILE_SOURCE` and `GEOAI_TILE_ZOOM` control the satellite GeoTIFF cache downloaded on backend startup. Keep `GEOAI_TILE_ZOOM=18` for urban districts. `GEOAI_HOAVANG_TILE_ZOOM=16` keeps Hoa Vang lighter because its boundary is much larger. `GEOAI_DEVICE` can be `cpu` or a CUDA device such as `cuda:0` when PyTorch GPU support is installed. `GEOAI_BATCH_SIZE=1` is safer for 4GB GPUs such as GTX 1650/1060.

`GEOAI_PRELOAD_AI_FOOTPRINTS=false` keeps startup light by skipping AI footprint precomputation. `GEOAI_ALLOW_RUNTIME_AI_EXTRACTION=true` makes `geoai` mode run inference during the request by cropping the district GeoTIFF cache to the selected bbox and sending that crop to the model.

### 7. Run the app

Option A, start everything with scripts:

```bash
# Windows
start_geoai.bat

# Linux/Mac
chmod +x start_geoai.sh
./start_geoai.sh
```

Option B, run backend and frontend separately:

Terminal 1:

```bash
python geoai_backend.py
```

Terminal 2:

```bash
npm run dev
```

Open `http://localhost:3000`.

### 8. First startup behavior

On backend startup, the app downloads GADM level 3 administrative boundaries for Da Nang into `geoai_data/danang/`, creates `geoai_data/danang/overture_danang.gpkg` when it is missing, removes legacy Overture cache artifacts that are no longer used, and pre-downloads satellite GeoTIFF files for the configured Da Nang districts into `geoai_data/geotiff_cache/`. Startup is best-effort: if one heavy step fails, the server logs a warning and continues with whatever cache is available.

When a user scans buildings in `geoai` mode, the backend intersects the drawn bbox with the selected district polygon, crops the cached district GeoTIFF to the valid part of that geometry, runs `BuildingFootprintExtractor` on that crop, and clips the resulting footprints to the selected area. In `overture` mode, the backend reads vector data from the local Overture GeoPackage instead of running AI inference.

`geoai_data/` and `*.gpkg` are ignored by git because they are generated local data files.

Fine-tuned models should be placed under `geoai_data/models/`. The backend auto-loads `geoai_data/models/danang_urban_z18_maskrcnn/best_model.pth` when it exists, then `geoai_data/models/best_model.pth`, and falls back to the base GeoAI model only when no fine-tuned checkpoint is present. You can override this with `GEOAI_MODEL_PATH`, or set `GEOAI_FINETUNED_MODEL_PATH` for a fine-tuned checkpoint in another location.

Fresh clones do not include generated data in `geoai_data/`. With internet access, the backend can recreate GADM boundaries, Overture GeoPackage data, GeoTIFF imagery cache, and the base GeoAI model. To skip the heavy Overture download, set `GEOAI_DOWNLOAD_OVERTURE_IF_MISSING=false`.

### 9. Optional Da Nang bbox

The default Da Nang bbox is `107.82,15.88,108.35,16.20`. To override it, add this to `.env`:

```bash
GEOAI_DANANG_BBOX=107.82,15.88,108.35,16.20
```

Building scans inside that bbox use cached district GeoTIFF files as the raster source. `geoai` mode runs inference during the scan; `overture` mode reads local vector data.

---

## 🌐 Using the Application

1. **Open browser** → `http://localhost:3000`
2. **Choose an area**: all of Da Nang or a specific district
3. **Click "Chọn khung quét"** and draw a rectangle. Only the part inside the selected area is counted, up to 25 hectares.
4. **View GeoAI results** immediately after drawing; detected buildings are drawn on the map.

---

## 📂 Files to Know

| File                           | Purpose                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| **GEOAI_MODEL.md**             | 🤖 Real GeoAI model integration guide ⭐ **READ THIS FIRST** |
| `start_geoai.bat`              | ✅ Start all (Windows)                                       |
| `start_geoai.sh`               | ✅ Start all (Linux/Mac)                                     |
| `start_frontend_only.bat`      | Start only web frontend                                      |
| `STARTUP_GUIDE.md`             | Detailed startup instructions                                |
| `geoai_backend.py`             | Python Flask backend with real GeoAI model                   |
| `src/app/page.js`              | Home page                                                    |
| `src/app/api/analyze/route.js` | API Gateway                                                  |
| `src/components/Map.js`        | Leaflet map                                                  |

---

## 🐛 Troubleshooting

**"Command not found" error?**

- Use **Command Prompt (cmd)** or **PowerShell** on Windows, not bash

**"Port already in use"?**

```bash
# Windows
taskkill /F /PID <PID>

# Mac/Linux
lsof -ti :3000 | xargs kill -9
```

**For detailed help:** See `STARTUP_GUIDE.md`

---

## � Project Structure

```
geoAI_web/
├── geoai_backend.py          # Python Flask backend
├── requirements.txt          # Python dependencies
├── start_geoai.bat          # Start all (Windows)
├── start_geoai.sh           # Start all (Linux/Mac)
├── start_backend.bat        # Backend only (Windows)
├── start_backend.sh         # Backend only (Linux/Mac)
├── start_frontend_only.bat  # Frontend only
├── src/
│   ├── app/
│   │   ├── api/analyze/route.js    # API Gateway
│   │   ├── globals.css
│   │   ├── layout.js
│   │   ├── page.js                 # Home page
│   │   └── page.module.css
│   └── components/
│       ├── Map.js                  # Leaflet map
│       └── MapWrapper.js           # Analysis logic
└── public/                         # Static assets
```

---
