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
- 📊 Infrastructure analysis (roads, utilities)
- 🌱 Vegetation and land use classification
- 💾 Smart caching - fast results for same areas
- 📈 Real-time results with detailed statistics
- 🔄 Instant processing and display

---

## 🚀 What's New: Real GeoAI Model

**No more random data!** The application now uses **real building data** from **Overture Maps**.

When you draw a rectangle:
1. ✅ Downloads real building footprints
2. ✅ Extracts real infrastructure data
3. ✅ Calculates actual statistics
4. ✅ Caches for instant reuse

**[📚 See GEOAI_MODEL.md for technical details](GEOAI_MODEL.md)**

---

## 🔧 Setup

If auto-setup doesn't work, install dependencies manually:

**Python (Backend):**
```bash
pip install -r requirements.txt
```

**Node.js (Frontend):**
```bash
npm install
```

---

## 🌐 Using the Application

1. **Open browser** → `http://localhost:3000`
2. **Draw rectangle** on satellite map
3. **Click capture button** 📷 
4. **View GeoAI results** with building count, land use percentages, etc.

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
