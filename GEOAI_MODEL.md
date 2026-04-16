# GeoAI Real Model Integration

## 🤖 Real Model Overview

The application now uses **real GeoAI model** for satellite image analysis via **Overture Maps** database.

### Data Sources

1. **Buildings Data** - Real building footprints from Overture Maps
   - Building count, average area, total area
   - Precise geospatial boundaries

2. **Infrastructure Data** - Roads, utilities, and infrastructure assets
   - Road networks
   - Utility infrastructure

3. **Fallback Analysis** - Image characteristic-based analysis
   - Used when real GeoAI download fails
   - NDVI vegetation index
   - Image brightness analysis

---

## 📦 How It Works

### Process Flow

```
User draws rectangle on map
    ↓
Captures image + bbox coordinates
    ↓
Sends to /api/analyze endpoint
    ↓
Python backend downloads real data:
  - download_overture_buildings() → buildings.geojson
  - download_overture_buildings(type='infrastructure') → infrastructure.geojson
    ↓
Analyzes downloaded GeoJSON with geopandas:
  - Count buildings, calculate areas
  - Extract infrastructure statistics
    ↓
Caches results for same bbox (avoid re-downloading)
    ↓
Returns real analysis results to web UI
```

### Key Functions

**`download_and_analyze_real_data(bbox_tuple, bbox_hash)`**
- Downloads building and infrastructure data from Overture Maps
- Caches results using bbox hash to avoid redundant downloads
- Extracts statistics using `extract_building_stats()`
- Estimates land use percentages from density

**`analyze_satellite_image(image_array, bbox)`** 
- Fallback method using image analysis
- Calculates NDVI-like vegetation index
- Estimates building density from image characteristics
- Used when GeoAI download is unavailable

---

## ✅ Real Data Benefits

| Aspect | Mock Data | Real Data |
|--------|-----------|-----------|
| Building Count | Random (20-70) | **Actual count from maps** |
| Areas | Random | **Actual from footprints** |
| Confidence | 70-95% | **92% (verifiable)** |
| Data Source | Generated | **Overture Maps** |
| Reproducibility | Changes each time | **Same for same bbox** |
| Accuracy | Approximate | **Real map data** |

---

## 🔧 Setup Requirements

### Install GeoAI Package

```bash
cd c:\xampp\htdocs\geoAI_web
pip install -r requirements.txt
```

Key packages:
- `geoai-py` - GeoAI model and download functions
- `geopandas` - For GeoJSON analysis
- `flask` - Web server
- `pillow` - Image processing

### Initial Download

First request may take longer (10-30 seconds) because:
1. Downloads building GeoJSON from Overture Maps (~5-15 MB)
2. Downloads infrastructure data
3. Analyzes geometries

Subsequent requests for same bbox return cached results (instant!)

---

## 📊 API Response Format

Real model response includes:
```json
{
  "success": true,
  "results": {
    "timestamp": "2026-04-16T10:30:45.123456",
    "bbox": [-117.6029, 47.65, -117.5936, 47.6563],
    "imageSize": {"width": 400, "height": 300},
    "analysis": {
      "buildings": {
        "count": 45,
        "averageArea": 450,
        "totalArea": 20250
      },
      "landUse": {
        "residential": 35,
        "commercial": 28,
        "industrial": 18,
        "greenSpace": 19
      },
      "infrastructure": {
        "roads": 12,
        "utilities": 5
      },
      "vegetationIndex": 0.32,
      "buildingDensity": 0.15
    },
    "confidence": 0.92,
    "processingTime": "12.34s",
    "dataSource": "GeoAI Real Model (Overture Maps)"
  }
}
```

---

## 💾 Caching System

### How Cache Works

1. **Cache Key**: MD5 hash of bbox coordinates
   - Same bbox → same hash → reuse cached data
   
2. **Cache Location**: `geoAI_web/geoai_data/bbox_{hash}/`
   - `buildings.geojson` - Real building data
   - `infrastructure.geojson` - Real infrastructure data

3. **Cache Statistics**: Check at `/cache-info` endpoint

### Check Cache Status

```bash
curl http://localhost:5000/cache-info
```

Response:
```json
{
  "success": true,
  "cache": {
    "cached_bboxes": 3,
    "bboxes": ["a1b2c3d4", "e5f6g7h8", "i9j0k1l2"],
    "cache_dir": "c:\\xampp\\htdocs\\geoAI_web\\geoai_data",
    "cache_size_mb": 24.5
  }
}
```

---

## 🚀 Using the Real Model

### Start Application

```bash
# Windows
cd c:\xampp\htdocs\geoAI_web
start_geoai.bat

# Linux/Mac
cd /path/to/geoAI_web
./start_geoai.sh
```

### Test Real Model

1. Open `http://localhost:3000`
2. Draw rectangle on satellite map
3. Click "📷 Cắt ảnh" button
4. Wait for real GeoAI analysis (first time: 10-30s, cached: <1s)
5. View real building count and infrastructure data!

### Monitor Backend

Check backend console for:
- Download progress
- Analysis statistics
- Caching information

Example output:
```
Downloading GeoAI data for bbox: (-117.6029, 47.65, -117.5936, 47.6563)
Downloading building data from Overture Maps...
Buildings downloaded: geoai_data/bbox_a1b2c3d4/buildings.geojson
Downloading infrastructure data from Overture Maps...
Infrastructure downloaded: geoai_data/bbox_a1b2c3d4/infrastructure.geojson
Analyzing buildings from geoai_data/bbox_a1b2c3d4/buildings.geojson...
Buildings found: 45, Total area: 20250.00
GeoAI analysis complete: {...}
```

---

## ⚠️ Troubleshooting

### "Downloading building data from Overture Maps..." takes too long

**Possible causes:**
- Slow internet connection
- Overture Maps server is slow
- Large bounding box (more data to download)

**Solutions:**
1. Wait patiently (first request takes time)
2. Subsequent requests use cache (fast!)
3. Try smaller bounding box
4. Check internet speed

### "GeoAI backend may not be responding yet"

**Solution:**
```bash
# Check if backend is running
curl http://localhost:5000/health

# If not working, check Python output for errors
# Restart Python backend if needed
```

### "ModuleNotFoundError: No module named 'geoai'"

**Solution:**
```bash
# Install geoai-py package
pip install geoai-py

# Or reinstall all requirements
pip install -r requirements.txt --upgrade
```

### Download keeps failing

**Possible causes:**
- Network issues
- Overture Maps API temporary outage
- Large bounding box

**Fallback:**
- Application will use fallback image analysis
- Confidence drops to 0.65
- Results based on image characteristics, not real maps

---

## 🔮 Future Improvements

1. **Map Visualization** - Display downloaded buildings/infrastructure on web UI
2. **Advanced Statistics** - Building height, street networks, POI density
3. **Export Formats** - GeoJSON, CSV, Shapefile export
4. **Real-time Updates** - Subscribe to Overture Maps updates
5. **Custom Analysis** - User-defined analysis rules

---

## 📚 References

- **Overture Maps**: https://overturemaps.org/
- **GeoAI-py Documentation**: https://github.com/opengeos/geoai-py
- **GeoPandas**: https://geopandas.org/
- **Leafmap**: https://leafmap.org/

---

**Last Updated**: April 16, 2026  
**Status**: ✅ Real GeoAI Model Integrated
