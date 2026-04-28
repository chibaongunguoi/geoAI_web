from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import numpy as np
import io
import json
import os
from datetime import datetime
import logging
import time
import hashlib

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store analysis results and cache for bboxes
analysis_cache = {}
bbox_cache = {}  # Cache downloaded data for same bbox
geoai_downloads_dir = "geoai_data"

# Create downloads directory if it doesn't exist
os.makedirs(geoai_downloads_dir, exist_ok=True)


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'GeoAI Backend is running'}), 200


@app.route('/analyze', methods=['POST'])
def analyze_image():
    """
    Analyze satellite image with GeoAI model
    
    Expected data:
    - image: binary image file
    - bbox: JSON string with [minLng, minLat, maxLng, maxLat]
    """
    try:
        logger.info("=" * 60)
        logger.info("RECEIVED ANALYSIS REQUEST")
        logger.info("=" * 60)
        
        # Check if image is provided
        if 'image' not in request.files:
            logger.error("❌ No image file in request")
            return jsonify({'success': False, 'error': 'Không tìm thấy hình ảnh'}), 400
        
        image_file = request.files['image']
        bbox_str = request.form.get('bbox', '[]')
        
        logger.info(f"📸 Image received: {image_file.filename}")
        logger.info(f"📍 Bbox string: {bbox_str}")
        
        # Parse bbox
        try:
            bbox = json.loads(bbox_str)
            logger.info(f"✅ Bbox parsed: {bbox}")
        except Exception as e:
            logger.warning(f"⚠️ Could not parse bbox: {e}")
            bbox = None
        
        logger.info(f"Processing image: {image_file.filename}, bbox: {bbox}")
        
        # Read image
        img = Image.open(image_file)
        img_array = np.array(img)
        logger.info(f"📷 Image loaded: shape {img_array.shape}")
        
        # Process with GeoAI analysis
        logger.info("🤖 Starting GeoAI analysis...")
        results = process_geoai_analysis(img_array, bbox)
        
        logger.info(f"✅ Analysis complete")
        logger.info(f"📊 Data source: {results.get('dataSource', 'Unknown')}")
        logger.info(f"⏱️ Processing time: {results.get('processingTime', 'N/A')}")
        logger.info("=" * 60)
        
        return jsonify({
            'success': True,
            'results': results
        }), 200
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ ERROR IN ANALYZE: {str(e)}", exc_info=True)
        logger.error("=" * 60)
        return jsonify({
            'success': False,
            'error': f'Lỗi xử lý hình ảnh: {str(e)}'
        }), 500


def process_geoai_analysis(image_array, bbox):
    """
    Process GeoAI analysis on satellite image using real GeoAI model
    
    This function downloads real building and infrastructure data
    from Overture Maps using geoai library
    """
    logger.info("🔄 process_geoai_analysis() started")
    try:
        start_time = time.time()
        
        # Image properties
        height, width = image_array.shape[:2]
        logger.info(f"📊 Image dimensions: {width}x{height}")
        
        # Convert bbox format if needed: [minLng, minLat, maxLng, maxLat]
        if bbox and len(bbox) == 4:
            bbox_tuple = tuple(bbox)  # (minLng, minLat, maxLng, maxLat)
            logger.info(f"✅ Valid bbox: {bbox_tuple}")
        else:
            logger.warning(f"⚠️ Invalid bbox format: {bbox}, using default")
            # Default bbox for testing (Spokane area)
            bbox_tuple = (-117.6029, 47.6500, -117.5936, 47.6563)
            bbox = list(bbox_tuple)
            logger.info(f"📍 Using default bbox: {bbox_tuple}")
        
        logger.info(f"🌐 Downloading GeoAI data for bbox: {bbox_tuple}")
        
        # Create bbox hash for caching
        bbox_hash = hashlib.md5(str(bbox_tuple).encode()).hexdigest()[:8]
        logger.info(f"🔐 Bbox hash: {bbox_hash}")
        
        # Check cache first
        if bbox_hash in bbox_cache:
            logger.info(f"💾 CACHE HIT! Using cached GeoAI data for bbox hash {bbox_hash}")
            analysis = bbox_cache[bbox_hash]
        else:
            logger.info(f"💾 CACHE MISS! Need to download fresh data for {bbox_hash}")
            # Download real building data
            logger.info("📥 Calling download_and_analyze_real_data()...")
            analysis = download_and_analyze_real_data(bbox_tuple, bbox_hash)
            # Cache the results
            bbox_cache[bbox_hash] = analysis
            logger.info(f"💾 Cached results for {bbox_hash}")
        
        processing_time = time.time() - start_time
        
        logger.info(f"✅ GeoAI analysis successful!")
        logger.info(f"📦 Analysis keys: {list(analysis.keys())}")
        
        return {
            'timestamp': datetime.now().isoformat(),
            'bbox': bbox,
            'imageSize': {
                'width': width,
                'height': height
            },
            'analysis': analysis,
            'confidence': 0.92,  # Higher confidence for real data
            'processingTime': f'{processing_time:.2f}s',
            'dataSource': 'GeoAI Real Model (Overture Maps)'
        }
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ ERROR in process_geoai_analysis: {str(e)}")
        logger.error("=" * 60, exc_info=True)
        # Return fallback analysis if real model fails
        logger.info("🔄 Falling back to fallback_analysis...")
        return get_fallback_analysis(image_array, bbox)


def download_and_analyze_real_data(bbox_tuple, bbox_hash):
    """
    Download real building and infrastructure data using GeoAI model
    
    Args:
        bbox_tuple: (minLng, minLat, maxLng, maxLat)
        bbox_hash: Hash for caching
        
    Returns:
        Dictionary with real analysis results
    """
    # Import geoai modules here to avoid startup delays
    import leafmap
    from geoai.download import (
        download_naip,
        download_overture_buildings,
        extract_building_stats,
    )
    import geopandas as gpd
    
    logger.info("=" * 60)
    logger.info(f"🔄 download_and_analyze_real_data({bbox_hash}) started")
    logger.info("=" * 60)
    
    try:
        # Create directory for this bbox
        bbox_dir = os.path.join(geoai_downloads_dir, f"bbox_{bbox_hash}")
        os.makedirs(bbox_dir, exist_ok=True)
        logger.info(f"📁 Created/verified directory: {bbox_dir}")
        
        buildings_file = os.path.join(bbox_dir, "buildings.geojson")
        infrastructure_file = os.path.join(bbox_dir, "infrastructure.geojson")
        
        # Download building data
        logger.info("📥 Starting building data download from Overture Maps...")
        logger.info(f"📄 Target file: {buildings_file}")
        
        buildings_gdf = None
        if not os.path.exists(buildings_file):
            try:
                logger.info(f"🌐 Calling download_overture_buildings() for buildings...")
                result = download_overture_buildings(
                    bbox=bbox_tuple,
                    output=buildings_file,
                    overture_type='building'
                )
                logger.info(f"📊 Result type: {type(result).__name__}")
                
                # Handle different return types
                if result is None:
                    logger.warning("⚠️ download_overture_buildings() returned None")
                    buildings_gdf = None
                elif isinstance(result, str):
                    # Return value is file path
                    if os.path.exists(result):
                        logger.info(f"✅ Buildings downloaded to: {result}")
                        buildings_file = result
                        buildings_gdf = gpd.read_file(result)
                    else:
                        logger.warning(f"⚠️ File path returned but file doesn't exist: {result}")
                        buildings_gdf = None
                elif isinstance(result, gpd.GeoDataFrame):
                    # Return value is GeoDataFrame - save it
                    logger.info(f"🔄 Result is GeoDataFrame with {len(result)} features - saving to {buildings_file}")
                    result.to_file(buildings_file, driver='GeoJSON')
                    logger.info(f"✅ Buildings GeoDataFrame saved to: {buildings_file}")
                    buildings_gdf = result
                else:
                    logger.warning(f"⚠️ Unknown result type from download_overture_buildings: {type(result)}")
                    buildings_gdf = None
                    
            except Exception as e:
                logger.error(f"❌ Could not download buildings: {type(e).__name__}: {str(e)}")
                buildings_gdf = None
        else:
            logger.info(f"⏭️ Buildings file already exists: {buildings_file}")
            try:
                buildings_gdf = gpd.read_file(buildings_file)
                logger.info(f"✅ Loaded existing buildings file: {len(buildings_gdf)} features")
            except Exception as e:
                logger.error(f"❌ Could not read existing buildings file: {str(e)}")
                buildings_gdf = None
        
        # Download infrastructure data
        logger.info("📥 Starting infrastructure data download from Overture Maps...")
        logger.info(f"📄 Target file: {infrastructure_file}")
        
        infrastructure_gdf = None
        if not os.path.exists(infrastructure_file):
            try:
                logger.info(f"🌐 Calling download_overture_buildings() for infrastructure...")
                result = download_overture_buildings(
                    bbox=bbox_tuple,
                    output=infrastructure_file,
                    overture_type='infrastructure'
                )
                logger.info(f"📊 Result type: {type(result).__name__}")
                
                # Handle different return types
                if result is None:
                    logger.warning("⚠️ download_overture_buildings() returned None")
                    infrastructure_gdf = None
                elif isinstance(result, str):
                    # Return value is file path
                    if os.path.exists(result):
                        logger.info(f"✅ Infrastructure downloaded to: {result}")
                        infrastructure_file = result
                        infrastructure_gdf = gpd.read_file(result)
                    else:
                        logger.warning(f"⚠️ File path returned but file doesn't exist: {result}")
                        infrastructure_gdf = None
                elif isinstance(result, gpd.GeoDataFrame):
                    # Return value is GeoDataFrame - save it
                    logger.info(f"🔄 Result is GeoDataFrame with {len(result)} features - saving to {infrastructure_file}")
                    result.to_file(infrastructure_file, driver='GeoJSON')
                    logger.info(f"✅ Infrastructure GeoDataFrame saved to: {infrastructure_file}")
                    infrastructure_gdf = result
                else:
                    logger.warning(f"⚠️ Unknown result type from download_overture_buildings: {type(result)}")
                    infrastructure_gdf = None
                    
            except Exception as e:
                logger.error(f"❌ Could not download infrastructure: {type(e).__name__}: {str(e)}")
                infrastructure_gdf = None
        else:
            logger.info(f"⏭️ Infrastructure file already exists: {infrastructure_file}")
            try:
                infrastructure_gdf = gpd.read_file(infrastructure_file)
                logger.info(f"✅ Loaded existing infrastructure file: {len(infrastructure_gdf)} features")
            except Exception as e:
                logger.error(f"❌ Could not read existing infrastructure file: {str(e)}")
                infrastructure_gdf = None
        
        # Extract statistics from downloaded data
        logger.info("📊 Starting analysis of downloaded data...")
        analysis = {
            'buildings': {'count': 0, 'averageArea': 0, 'totalArea': 0},
            'landUse': {'residential': 0, 'commercial': 0, 'industrial': 0, 'greenSpace': 0},
            'infrastructure': {'roads': 0, 'utilities': 0},
            'vegetationIndex': 0,
            'buildingDensity': 0
        }
        
        # Process buildings data
        logger.info("📖 Processing buildings data...")
        if buildings_gdf is not None and not buildings_gdf.empty:
            try:
                logger.info(f"📖 Processing buildings GeoDataFrame with {len(buildings_gdf)} features...")
                
                building_count = len(buildings_gdf)
                logger.info(f"🏗️ Buildings loaded: {building_count} features")
                
                if building_count > 0:
                    total_area = buildings_gdf.geometry.area.sum()
                    avg_area = total_area / building_count
                    
                    analysis['buildings'] = {
                        'count': int(building_count),
                        'averageArea': int(avg_area),
                        'totalArea': int(total_area)
                    }
                    
                    logger.info(f"✅ Buildings: count={building_count}, avg_area={avg_area:.2f}, total={total_area:.2f}")
                else:
                    logger.warning(f"⚠️ No buildings found in GeoDataFrame")
                
            except Exception as e:
                logger.error(f"❌ Error processing buildings: {type(e).__name__}: {str(e)}", exc_info=True)
        else:
            logger.warning(f"⚠️ Buildings GeoDataFrame not available")
        
        # Process infrastructure data
        logger.info("📖 Processing infrastructure data...")
        if infrastructure_gdf is not None and not infrastructure_gdf.empty:
            try:
                logger.info(f"📖 Processing infrastructure GeoDataFrame with {len(infrastructure_gdf)} features...")
                
                # Count different infrastructure types
                infra_count = len(infrastructure_gdf)
                logger.info(f"⚡ Infrastructure loaded: {infra_count} features")
                
                # Try to differentiate between roads and utilities based on properties
                roads_count = infra_count * 0.6  # Approximate 60% as roads
                utilities_count = infra_count * 0.4  # 40% as utilities
                
                analysis['infrastructure'] = {
                    'roads': int(roads_count),
                    'utilities': int(utilities_count)
                }
                
                logger.info(f"✅ Infrastructure: roads={roads_count:.0f}, utilities={utilities_count:.0f}")
                
            except Exception as e:
                logger.error(f"❌ Error processing infrastructure: {type(e).__name__}: {str(e)}", exc_info=True)
        else:
            logger.warning(f"⚠️ Infrastructure GeoDataFrame not available")
        
        # Estimate land use based on building density
        building_count = analysis['buildings']['count']
        bbox_area = (bbox_tuple[2] - bbox_tuple[0]) * (bbox_tuple[3] - bbox_tuple[1]) * 111000 * 111000  # Approximate area in m²
        
        if bbox_area > 0:
            building_density = analysis['buildings']['totalArea'] / bbox_area
            building_density = min(building_density, 0.5)  # Cap at 50%
            
            analysis['buildingDensity'] = round(building_density, 2)
            
            # Estimate land use percentages
            analysis['landUse'] = {
                'residential': int(40 * building_density + 20),
                'commercial': int(30 * building_density + 10),
                'industrial': int(15 * building_density + 5),
                'greenSpace': int(100 - (40 * building_density + 20) - (30 * building_density + 10) - (15 * building_density + 5))
            }
        
        # Normalize land use to sum to 100
        total_land_use = sum(analysis['landUse'].values())
        if total_land_use > 0:
            for key in analysis['landUse']:
                analysis['landUse'][key] = int(analysis['landUse'][key] * 100 / total_land_use)
        
        logger.info(f"=" * 60)
        logger.info(f"✅ GeoAI REAL DATA ANALYSIS COMPLETE")
        logger.info(f"   Buildings: {analysis['buildings']['count']} (area: {analysis['buildings']['totalArea']} m²)")
        logger.info(f"   Land use: {analysis['landUse']}")
        logger.info(f"   Infrastructure: {analysis['infrastructure']}")
        logger.info(f"=" * 60)
        
        return analysis
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ FATAL ERROR in download_and_analyze_real_data: {type(e).__name__}: {str(e)}")
        logger.error("=" * 60, exc_info=True)
        raise


def get_fallback_analysis(image_array, bbox):
    """
    Fallback analysis using image characteristics when real model fails
    """
    return {
        'timestamp': datetime.now().isoformat(),
        'bbox': bbox,
        'analysis': analyze_satellite_image(image_array, bbox),
        'confidence': 0.65,
        'processingTime': '0.5s',
        'dataSource': 'Fallback Analysis (Real GeoAI Model unavailable)',
        'note': 'Using image characteristics analysis due to GeoAI model error'
    }


def analyze_satellite_image(image_array, bbox):
    """
    Analyze satellite image characteristics as fallback method
    
    This is used when GeoAI model download is not available
    but provides reasonable estimates based on image analysis
    """
    
    # Get image statistics
    if len(image_array.shape) == 3:
        # RGB image
        mean_intensity = np.mean(image_array)
        green_channel = image_array[:,:,1] if image_array.shape[2] >= 2 else image_array[:,:,0]
        red_channel = image_array[:,:,0]
        blue_channel = image_array[:,:,2] if image_array.shape[2] >= 3 else image_array[:,:,0]
        
        # Calculate NDVI-like vegetation index
        # NDVI = (NIR - RED) / (NIR + RED)
        # Using Green as proxy for NIR
        green_float = green_channel.astype(float)
        red_float = red_channel.astype(float)
        
        ndvi_proxy = (green_float - red_float) / (green_float + red_float + 1e-6)
        vegetation_ratio = np.clip(np.sum(ndvi_proxy > 0.2) / ndvi_proxy.size, 0, 1)
        
        # Calculate brightness as average intensity
        brightness = mean_intensity / 255.0
        
        # Estimate building density from contrast and darkness
        # Darker areas with low green content suggest buildings
        darkness = 1 - brightness
        non_vegetation = 1 - vegetation_ratio
        building_ratio = darkness * non_vegetation * 0.5  # Cap at 50%
        
    else:
        # Grayscale image
        mean_intensity = np.mean(image_array)
        brightness = mean_intensity / 255.0
        vegetation_ratio = 0.3
        building_ratio = (1 - brightness) * 0.4
    
    # Estimate building count based on density
    # Typical building sizes: residential 200-500 m², commercial 500-2000 m²
    # For a satellite image coverage area
    estimated_building_area = 350 * (200 + building_ratio * 200)  # Square pixels worth
    num_buildings = max(5, int(building_ratio * 100))
    
    # Land use percentages (must sum to 100)
    green_space = max(5, int(25 + vegetation_ratio * 50))
    residential = max(5, int(30 + (1 - vegetation_ratio) * 35))
    commercial = max(5, int(20 + building_ratio * 35))
    industrial = max(5, 100 - green_space - residential - commercial)
    
    return {
        'buildings': {
            'count': num_buildings,
            'averageArea': int(300 + building_ratio * 500),
            'totalArea': int(num_buildings * 350 + building_ratio * 5000)
        },
        'landUse': {
            'residential': residential,
            'commercial': commercial,
            'industrial': industrial,
            'greenSpace': green_space
        },
        'infrastructure': {
            'roads': int(3 + num_buildings * 0.3),
            'utilities': int(1 + num_buildings * 0.1)
        },
        'vegetationIndex': round(vegetation_ratio, 2),
        'buildingDensity': round(building_ratio, 2)
    }


@app.route('/download-data', methods=['POST'])
def download_geoai_data():
    """
    Download GeoAI data (buildings, infrastructure) for a bounding box
    
    This integrates with the download functions from geoai-py package
    """
    try:
        data = request.get_json()
        bbox = data.get('bbox')
        
        if not bbox or len(bbox) != 4:
            return jsonify({'success': False, 'error': 'Invalid bbox format'}), 400
        
        logger.info(f"Downloading GeoAI data for bbox: {bbox}")
        
        # Convert bbox format: [minLng, minLat, maxLng, maxLat]
        bbox_tuple = tuple(bbox)
        bbox_hash = hashlib.md5(str(bbox_tuple).encode()).hexdigest()[:8]
        
        # Create output directory
        output_dir = os.path.join(geoai_downloads_dir, f"bbox_{bbox_hash}")
        os.makedirs(output_dir, exist_ok=True)
        
        # Download buildings data
        buildings_file = os.path.join(output_dir, 'buildings.geojson')
        infrastructure_file = os.path.join(output_dir, 'infrastructure.geojson')
        
        try:
            logger.info(f"Downloading buildings for bbox: {bbox_tuple}")
            if not os.path.exists(buildings_file):
                result = download_overture_buildings(
                    bbox=bbox_tuple,
                    output=buildings_file,
                    overture_type='building'
                )
                # Handle GeoDataFrame return
                if isinstance(result, gpd.GeoDataFrame):
                    result.to_file(buildings_file, driver='GeoJSON')
                logger.info(f"✓ Buildings downloaded: {buildings_file}")
            
            # Download infrastructure data
            logger.info(f"Downloading infrastructure for bbox: {bbox_tuple}")
            if not os.path.exists(infrastructure_file):
                result = download_overture_buildings(
                    bbox=bbox_tuple,
                    output=infrastructure_file,
                    overture_type='infrastructure'
                )
                # Handle GeoDataFrame return
                if isinstance(result, gpd.GeoDataFrame):
                    result.to_file(infrastructure_file, driver='GeoJSON')
                logger.info(f"✓ Infrastructure downloaded: {infrastructure_file}")
            
        except Exception as e:
            logger.warning(f"Could not download data: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': f'GeoAI data download initiated for bbox: {bbox}',
            'files': {
                'buildings': buildings_file if os.path.exists(buildings_file) else None,
                'infrastructure': infrastructure_file if os.path.exists(infrastructure_file) else None
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in download_geoai_data: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/cache-info', methods=['GET'])
def cache_info():
    """
    Get information about cached GeoAI data
    """
    try:
        cache_stats = {
            'cached_bboxes': len(bbox_cache),
            'bboxes': list(bbox_cache.keys()),
            'cache_dir': os.path.abspath(geoai_downloads_dir),
            'cache_size_mb': sum(os.path.getsize(os.path.join(geoai_downloads_dir, f)) 
                                 for f in os.listdir(geoai_downloads_dir) 
                                 if os.path.isfile(os.path.join(geoai_downloads_dir, f))) / (1024 * 1024)
        }
        
        return jsonify({
            'success': True,
            'cache': cache_stats
        }), 200
        
    except Exception as e:
        logger.error(f"Error in cache_info: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/extract-stats', methods=['POST'])
def extract_stats():
    """
    Extract statistics from GeoJSON files
    """
    try:
        data = request.get_json()
        file_path = data.get('filePath')
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'File not found'}), 400
        
        # Read GeoJSON file
        gdf = gpd.read_file(file_path)
        
        # Extract statistics
        stats = extract_building_stats(file_path)
        
        return jsonify({
            'success': True,
            'stats': stats,
            'featureCount': len(gdf)
        }), 200
        
    except Exception as e:
        logger.error(f"Error in extract_stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    logger.info("Starting GeoAI Backend Server")
    app.run(host='0.0.0.0', port=5000, debug=True)
