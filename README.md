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
- 🤖 **Real GeoAI Model** - Automatic building detection & analysis from Overture Maps
- 🏢 Real building footprints, count, and area calculation
- 🟥 Red boxes for buildings, 🟧 orange boxes for infrastructure/factory-like objects, and 🟩 green boxes for vegetation areas
- 🗃️ Da Nang GeoPackage preload for faster local scans
- 📊 Infrastructure analysis (roads, utilities)
- 🌱 Vegetation and land use classification
- 💾 Smart caching - fast results for same areas
- 📈 Real-time results with detailed statistics
- 🔄 Instant processing and display

---

## 🚀 What's New: Real GeoAI Model

**No more random data!** The application now uses **real building data** from **Overture Maps**.

When you draw a rectangle:
1. ✅ Reads preloaded Da Nang GeoPackage when the selected area is inside Da Nang
2. ✅ Uses the selected scan mode: all, buildings, infrastructure/factory-like objects, or green areas
3. ✅ Extracts matching data and calculates statistics
4. ✅ Draws color-coded boxes on the map

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

The backend uses GeoAI, GeoPandas, Overture Maps, Shapely, Flask, and image-processing packages. Installation can take a while because geospatial packages are large.

### 5. Install frontend dependencies

```bash
npm install
```

### 6. Configure environment variables

Create a `.env` file in the project root when you need custom settings:

```bash
GEOAI_DANANG_BBOX=107.82,15.88,108.35,16.20
GEOAI_BACKEND_URL=http://localhost:5000
```

`GEOAI_DANANG_BBOX` controls the Da Nang area that is downloaded to GeoPackage when the backend starts. `GEOAI_BACKEND_URL` is used by the Next.js API route when forwarding scan requests to Flask.

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

On backend startup, the app refreshes `geoai_data/danang/overture_danang.gpkg`. It may take longer the first time because it downloads Overture data for Da Nang. Later startups compare the latest downloaded data with the local metadata and replace the GeoPackage only when the data changed.

`geoai_data/` and `*.gpkg` are ignored by git because they are generated local data files.

### 9. Optional Da Nang bbox

The default Da Nang bbox is `107.82,15.88,108.35,16.20`. To override it, add this to `.env`:

```bash
GEOAI_DANANG_BBOX=107.82,15.88,108.35,16.20
```

Scans inside that bbox read from the local GeoPackage instead of downloading Overture data during the scan.

---

## 🌐 Using the Application

1. **Open browser** → `http://localhost:3000`
2. **Choose scan mode**: all, buildings, infrastructure/factory-like objects, or green areas
3. **Click "Chọn khung quét"** and draw a rectangle inside Da Nang
4. **View GeoAI results** immediately after drawing; matching objects are drawn with color-coded boxes on the map.

---

## 📂 Files to Know

| File | Purpose |
|------|---------|
| **GEOAI_MODEL.md** | 🤖 Real GeoAI model integration guide ⭐ **READ THIS FIRST** |
| `start_geoai.bat` | ✅ Start all (Windows) |
| `start_geoai.sh` | ✅ Start all (Linux/Mac) |
| `start_frontend_only.bat` | Start only web frontend |
| `STARTUP_GUIDE.md` | Detailed startup instructions |
| `geoai_backend.py` | Python Flask backend with real GeoAI model |
| `src/app/page.js` | Home page |
| `src/app/api/analyze/route.js` | API Gateway |
| `src/components/Map.js` | Leaflet map |

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
