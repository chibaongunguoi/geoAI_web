from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import numpy as np
import io
import json
import leafmap
import requests
import zipfile
import unicodedata
import re
from geoai.download import (
    download_naip,
    download_overture_buildings,
    extract_building_stats,
)
import geopandas as gpd
import pandas as pd
import os
import shutil
import tempfile
from datetime import datetime
import logging
import time
import hashlib
import math
import types
from pathlib import Path

import rasterio
from rasterio.mask import mask as rasterio_mask
from rasterio.warp import transform_geom
from shapely.geometry import box, mapping

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store analysis results and cache for bboxes
analysis_cache = {}
bbox_cache = {}  # Cache downloaded data for same bbox
geoai_downloads_dir = "geoai_data"
DEFAULT_BBOX = (-117.6029, 47.6500, -117.5936, 47.6563)
DANANG_BBOX = (107.82, 15.88, 108.35, 16.20)
DANANG_BBOX_ENV = "GEOAI_DANANG_BBOX"
DANANG_DATA_DIR = Path(geoai_downloads_dir) / "danang"
DANANG_GPKG = DANANG_DATA_DIR / "overture_danang.gpkg"
DANANG_META = DANANG_DATA_DIR / "overture_danang.meta.json"
OBJECT_BOX_LIMIT = 500
MAX_SCAN_AREA_M2 = 250_000
DEFAULT_SCAN_TYPES = ("building",)
GREEN_LAYER = "green"
GPKG_LAYERS = ("buildings", "infrastructure", GREEN_LAYER)
GEOTIFF_CACHE_DIR = Path(geoai_downloads_dir) / "geotiff_cache"
AI_SCAN_DIR = Path(geoai_downloads_dir) / "ai_scans"
AI_TILE_SOURCE = os.getenv("GEOAI_TILE_SOURCE", "Satellite")
AI_TILE_ZOOM = int(os.getenv("GEOAI_TILE_ZOOM", "18"))
ZONE_TILE_ZOOMS = {
    "hoavang": int(os.getenv("GEOAI_HOAVANG_TILE_ZOOM", "16")),
}
AI_CONFIDENCE_THRESHOLD = float(os.getenv("GEOAI_CONFIDENCE_THRESHOLD", "0.5"))
AI_BATCH_SIZE = int(os.getenv("GEOAI_BATCH_SIZE", "1"))
AI_CONTEXT_BUFFER_M = float(os.getenv("GEOAI_CONTEXT_BUFFER_M", "50"))
AI_TILE_OVERLAP = float(os.getenv("GEOAI_TILE_OVERLAP", "0.5"))
AI_MASK_THRESHOLD = float(os.getenv("GEOAI_MASK_THRESHOLD", "0.5"))
AI_SIMPLIFY_TOLERANCE = float(os.getenv("GEOAI_SIMPLIFY_TOLERANCE", "0.002"))
AI_SNAP_TO_REFERENCE_FOOTPRINTS = os.getenv(
    "GEOAI_SNAP_TO_REFERENCE_FOOTPRINTS",
    "true",
).lower() in ("1", "true", "yes")
AI_REFERENCE_SNAP_MIN_OVERLAP = float(os.getenv("GEOAI_REFERENCE_SNAP_MIN_OVERLAP", "0.05"))
AI_DEVICE = os.getenv("GEOAI_DEVICE") or None
AI_MODEL_DIR = Path(os.getenv("GEOAI_MODEL_DIR", Path(geoai_downloads_dir) / "models"))
AI_BASE_MODEL_PATH = os.getenv("GEOAI_BASE_MODEL_PATH", "building_footprints_usa.pth")


def resolve_ai_model_path():
    explicit_model_path = os.getenv("GEOAI_MODEL_PATH")
    if explicit_model_path:
        return explicit_model_path, "GEOAI_MODEL_PATH"

    finetuned_model_path = os.getenv("GEOAI_FINETUNED_MODEL_PATH")
    if finetuned_model_path:
        if Path(finetuned_model_path).exists():
            return finetuned_model_path, "GEOAI_FINETUNED_MODEL_PATH"
        logger.warning(
            f"GEOAI_FINETUNED_MODEL_PATH does not exist, falling back to auto model resolution: {finetuned_model_path}"
        )

    finetuned_candidates = (
        AI_MODEL_DIR / "danang_urban_z18_maskrcnn" / "best_model.pth",
        AI_MODEL_DIR / "best_model.pth",
    )
    for candidate in finetuned_candidates:
        if candidate.exists():
            return str(candidate), "auto_finetuned_best_model"

    return AI_BASE_MODEL_PATH, "base_model"


AI_MODEL_PATH, AI_MODEL_SOURCE = resolve_ai_model_path()
PRELOAD_AI_FOOTPRINTS = os.getenv("GEOAI_PRELOAD_AI_FOOTPRINTS", "false").lower() not in ("0", "false", "no")
ALLOW_RUNTIME_AI_EXTRACTION = os.getenv("GEOAI_ALLOW_RUNTIME_AI_EXTRACTION", "true").lower() in ("1", "true", "yes")
PRELOAD_OVERTURE = os.getenv("GEOAI_PRELOAD_OVERTURE", "true").lower() not in ("0", "false", "no")
DOWNLOAD_OVERTURE_IF_MISSING = os.getenv("GEOAI_DOWNLOAD_OVERTURE_IF_MISSING", "true").lower() in ("1", "true", "yes")
GADM_DANANG_URL = os.getenv(
    "GADM_DANANG_URL",
    "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_VNM_3.json.zip",
)
GADM_ZIP_MEMBER = "gadm41_VNM_3.json"
DANANG_WARDS_GEOJSON = DANANG_DATA_DIR / "gadm41_danang_wards.geojson"
DANANG_DISTRICTS_GEOJSON = DANANG_DATA_DIR / "gadm41_danang_districts.geojson"
DEFAULT_ADMIN_AREA = os.getenv("GEOAI_DEFAULT_ADMIN_AREA", "all_da_nang")
ALL_ADMIN_AREA = "all_da_nang"
DEFAULT_SCAN_MODE = os.getenv("GEOAI_DEFAULT_SCAN_MODE", "geoai")
SCAN_MODE_GEOAI = "geoai"
SCAN_MODE_OVERTURE = "overture"
SCAN_MODES = (SCAN_MODE_GEOAI, SCAN_MODE_OVERTURE)
ADMIN_AREA_ALIASES = {
    "hai_chau": "haichau",
    "thanh_khe": "thanhkhe",
    "son_tra": "sontra",
    "ngu_hanh_son": "nguhanhson",
    "lien_chieu": "lienchieu",
    "cam_le": "camle",
    "hoa_vang": "hoavang",
}
FALLBACK_DA_NANG_ZONES = {
    "hai_chau": (108.2058, 16.0401, 108.2280, 16.0580),
    "thanh_khe": (108.1800, 16.0500, 108.2100, 16.0750),
    "son_tra": (108.2200, 16.0600, 108.2800, 16.1100),
    "ngu_hanh_son": (108.2300, 15.9800, 108.2900, 16.0300),
    "lien_chieu": (108.1200, 16.0700, 108.1800, 16.1200),
    "cam_le": (108.2000, 15.9900, 108.2500, 16.0400),
    "hoa_vang": (107.82, 15.88, 108.20, 16.20),
}
FALLBACK_ZONE_LABELS = {
    "hai_chau": "Hải Châu",
    "thanh_khe": "Thanh Khê",
    "son_tra": "Sơn Trà",
    "ngu_hanh_son": "Ngũ Hành Sơn",
    "lien_chieu": "Liên Chiểu",
    "cam_le": "Cẩm Lệ",
    "hoa_vang": "Hòa Vang",
}
admin_boundaries_cache = None
building_extractor_cache = None

# Create downloads directory if it doesn't exist
os.makedirs(geoai_downloads_dir, exist_ok=True)


def bbox_hash_for(bbox_tuple):
    return hashlib.md5(str(bbox_tuple).encode()).hexdigest()[:8]


def analysis_cache_key(bbox_tuple, scan_types):
    cache_value = {
        "bbox": list(bbox_tuple),
        "scanTypes": sorted(scan_types),
    }
    return hashlib.md5(json.dumps(cache_value, sort_keys=True).encode()).hexdigest()[:8]


def admin_analysis_cache_key(bbox_tuple, scan_types, admin_area_id):
    cache_value = {
        "bbox": list(bbox_tuple),
        "scanTypes": sorted(scan_types),
        "adminArea": admin_area_id,
    }
    return hashlib.md5(json.dumps(cache_value, sort_keys=True).encode()).hexdigest()[:8]


def slugify_name(value):
    value = str(value or "").replace("Đ", "D").replace("đ", "d")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = re.sub(r"[^a-zA-Z0-9]+", "_", value).strip("_").lower()
    return value


def compact_slug(value):
    return slugify_name(value).replace("_", "")


def normalize_admin_area_id(value):
    admin_area_id = slugify_name(value or DEFAULT_ADMIN_AREA)
    return ADMIN_AREA_ALIASES.get(admin_area_id, admin_area_id)


def normalize_scan_mode(value):
    scan_mode = slugify_name(value or DEFAULT_SCAN_MODE)
    if scan_mode not in SCAN_MODES:
        return DEFAULT_SCAN_MODE
    return scan_mode


def normalize_bbox(values):
    bbox = tuple(float(value) for value in values)
    if len(bbox) != 4:
        raise ValueError("bbox must contain exactly 4 numbers")
    return bbox


def parse_bbox(raw_value, default_bbox):
    if not raw_value:
        return default_bbox

    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        parsed = [part.strip() for part in raw_value.split(",") if part.strip()]

    return normalize_bbox(parsed)


def bbox_intersects(left_bbox, right_bbox):
    left_min_x, left_min_y, left_max_x, left_max_y = left_bbox
    right_min_x, right_min_y, right_max_x, right_max_y = right_bbox

    return not (
        left_max_x < right_min_x
        or left_min_x > right_max_x
        or left_max_y < right_min_y
        or left_min_y > right_max_y
    )


def clip_bbox(left_bbox, right_bbox):
    if not bbox_intersects(left_bbox, right_bbox):
        return None

    left_min_x, left_min_y, left_max_x, left_max_y = left_bbox
    right_min_x, right_min_y, right_max_x, right_max_y = right_bbox
    clipped = (
        max(left_min_x, right_min_x),
        max(left_min_y, right_min_y),
        min(left_max_x, right_max_x),
        min(left_max_y, right_max_y),
    )
    if clipped[0] >= clipped[2] or clipped[1] >= clipped[3]:
        return None
    return clipped


def bbox_within(left_bbox, right_bbox):
    left_min_x, left_min_y, left_max_x, left_max_y = left_bbox
    right_min_x, right_min_y, right_max_x, right_max_y = right_bbox

    return (
        left_min_x >= right_min_x
        and left_min_y >= right_min_y
        and left_max_x <= right_max_x
        and left_max_y <= right_max_y
    )


def is_bbox_inside_danang(bbox_tuple):
    danang_bbox = parse_bbox(os.getenv(DANANG_BBOX_ENV), DANANG_BBOX)
    return bbox_within(bbox_tuple, danang_bbox)


def is_bbox_intersecting_danang(bbox_tuple):
    danang_bbox = parse_bbox(os.getenv(DANANG_BBOX_ENV), DANANG_BBOX)
    return bbox_intersects(bbox_tuple, danang_bbox)


def bbox_area_m2(bbox_tuple):
    min_lng, min_lat, max_lng, max_lat = bbox_tuple
    mid_lat = math.radians((min_lat + max_lat) / 2)
    width_m = abs(max_lng - min_lng) * 111_320 * math.cos(mid_lat)
    height_m = abs(max_lat - min_lat) * 110_540
    return width_m * height_m


def empty_geodataframe(crs="EPSG:4326"):
    return gpd.GeoDataFrame(geometry=[], crs=crs)


def clip_gdf_to_bbox(gdf, bbox_tuple):
    if gdf is None or gdf.empty:
        return empty_geodataframe(getattr(gdf, "crs", "EPSG:4326"))

    query_bounds = box(*bbox_tuple)
    clipped = gdf[gdf.geometry.intersects(query_bounds)].copy()
    if clipped.empty:
        return empty_geodataframe(getattr(gdf, "crs", "EPSG:4326"))

    clipped["geometry"] = clipped.geometry.intersection(query_bounds)
    clipped = clipped[clipped.geometry.notna() & ~clipped.geometry.is_empty]
    return clipped


def clip_gdf_to_geometry(gdf, clip_geometry):
    if gdf is None or gdf.empty or clip_geometry is None or clip_geometry.is_empty:
        return empty_geodataframe(getattr(gdf, "crs", "EPSG:4326"))

    clipped = gdf[gdf.geometry.intersects(clip_geometry)].copy()
    if clipped.empty:
        return empty_geodataframe(getattr(gdf, "crs", "EPSG:4326"))

    clipped["geometry"] = clipped.geometry.intersection(clip_geometry)
    clipped = clipped[clipped.geometry.notna() & ~clipped.geometry.is_empty]
    return clipped


def select_gdf_intersecting_geometry(gdf, query_geometry):
    if gdf is None or gdf.empty or query_geometry is None or query_geometry.is_empty:
        return empty_geodataframe(getattr(gdf, "crs", "EPSG:4326"))

    selected = gdf.to_crs("EPSG:4326") if gdf.crs else gdf.set_crs("EPSG:4326")
    selected = selected[
        selected.geometry.notna()
        & ~selected.geometry.is_empty
        & selected.geometry.intersects(query_geometry)
    ].copy()
    if selected.empty:
        return empty_geodataframe(getattr(gdf, "crs", "EPSG:4326"))

    return selected


def buffer_geometry_meters(geometry, distance_m):
    if geometry is None or geometry.is_empty or distance_m <= 0:
        return geometry

    try:
        series = gpd.GeoSeries([geometry], crs="EPSG:4326")
        projected_crs = series.estimate_utm_crs()
        return series.to_crs(projected_crs).buffer(distance_m).to_crs("EPSG:4326").iloc[0]
    except Exception as e:
        logger.warning(f"Could not buffer geometry in meters, using degree fallback: {str(e)}")
        return geometry.buffer(distance_m / 111_320)


def shapely_area_m2(geometry):
    if geometry is None or geometry.is_empty:
        return 0

    try:
        series = gpd.GeoSeries([geometry], crs="EPSG:4326")
        projected = series.to_crs(series.estimate_utm_crs())
        return float(projected.area.iloc[0])
    except Exception:
        return float(geometry.area)


def dataframe_digest(gdf):
    if gdf is None or gdf.empty:
        return "empty"

    digest = hashlib.sha256()
    digest.update(str(len(gdf)).encode())

    if "id" in gdf.columns:
        rows = gdf[["id", "geometry"]].copy()
        rows["id"] = rows["id"].astype(str)
        rows["geometry_wkb"] = rows.geometry.to_wkb(hex=True)
        rows = rows[["id", "geometry_wkb"]].sort_values(["id", "geometry_wkb"])
    else:
        rows = gdf[["geometry"]].copy()
        rows["geometry_wkb"] = rows.geometry.to_wkb(hex=True)
        rows = rows[["geometry_wkb"]].sort_values("geometry_wkb")

    for row in rows.itertuples(index=False):
        digest.update("|".join(str(value) for value in row).encode())

    return digest.hexdigest()


def gpkg_digest(gpkg_path):
    digests = {}
    for layer in GPKG_LAYERS:
        try:
            digests[layer] = dataframe_digest(gpd.read_file(gpkg_path, layer=layer))
        except Exception as e:
            logger.warning(f"Could not hash {layer} layer in {gpkg_path}: {str(e)}")
            digests[layer] = "unreadable"

    combined = hashlib.sha256()
    for layer in sorted(digests):
        combined.update(layer.encode())
        combined.update(digests[layer].encode())

    return combined.hexdigest()


def write_danang_gpkg(gpkg_path, bbox_tuple):
    logger.info(f"Downloading latest Overture data for Da Nang bbox: {bbox_tuple}")

    buildings_gdf = download_overture_buildings(
        bbox=bbox_tuple,
        output=str(gpkg_path),
        overture_type="building",
        layer="buildings",
        driver="GPKG",
    )
    if isinstance(buildings_gdf, gpd.GeoDataFrame):
        logger.info(f"Downloaded {len(buildings_gdf)} Da Nang building features")

    infrastructure_gdf = download_overture_buildings(
        bbox=bbox_tuple,
        output=str(gpkg_path),
        overture_type="infrastructure",
        layer="infrastructure",
        driver="GPKG",
        mode="a",
    )
    if isinstance(infrastructure_gdf, gpd.GeoDataFrame):
        logger.info(f"Downloaded {len(infrastructure_gdf)} Da Nang infrastructure features")

    try:
        green_gdf = download_overture_buildings(
            bbox=bbox_tuple,
            output=str(gpkg_path),
            overture_type="land_cover",
            layer=GREEN_LAYER,
            driver="GPKG",
            mode="a",
        )
        if isinstance(green_gdf, gpd.GeoDataFrame):
            logger.info(f"Downloaded {len(green_gdf)} Da Nang green features")
    except Exception as e:
        logger.warning(f"Could not download Da Nang green features: {str(e)}")


def read_json_file(path):
    if not path.exists():
        return {}

    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except Exception as e:
        logger.warning(f"Could not read metadata file {path}: {str(e)}")
        return {}


def write_json_file(path, payload):
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=True, indent=2)


def refresh_danang_gpkg():
    danang_bbox = parse_bbox(os.getenv(DANANG_BBOX_ENV), DANANG_BBOX)
    DANANG_DATA_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(dir=DANANG_DATA_DIR) as temp_dir:
        temp_gpkg = Path(temp_dir) / "overture_danang_latest.gpkg"
        write_danang_gpkg(temp_gpkg, danang_bbox)
        latest_digest = gpkg_digest(temp_gpkg)
        current_meta = read_json_file(DANANG_META)

        if (
            DANANG_GPKG.exists()
            and current_meta.get("digest") == latest_digest
            and current_meta.get("bbox") == list(danang_bbox)
        ):
            logger.info("Da Nang GeoPackage is already up to date")
            return

        if DANANG_GPKG.exists():
            DANANG_GPKG.unlink()

        shutil.move(str(temp_gpkg), str(DANANG_GPKG))
        write_json_file(DANANG_META, {
            "bbox": list(danang_bbox),
            "digest": latest_digest,
            "updatedAt": datetime.now().isoformat(),
        })
        logger.info(f"Da Nang GeoPackage updated: {DANANG_GPKG}")


def cleanup_legacy_overture_artifacts():
    DANANG_DATA_DIR.mkdir(parents=True, exist_ok=True)

    legacy_paths = []
    for path in DANANG_DATA_DIR.iterdir():
        if path == DANANG_GPKG or path == DANANG_META:
            continue
        if path in (DANANG_WARDS_GEOJSON, DANANG_DISTRICTS_GEOJSON):
            continue
        if path.name.startswith("bbox_"):
            legacy_paths.append(path)
            continue
        if path.is_file() and path.suffix.lower() in {".gpkg", ".fgb", ".geojson"} and path.name != DANANG_GPKG.name:
            legacy_paths.append(path)

    for path in legacy_paths:
        try:
            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink(missing_ok=True)
            logger.info(f"Removed legacy Overture artifact: {path}")
        except Exception as e:
            logger.warning(f"Could not remove legacy Overture artifact {path}: {str(e)}")


def prepare_existing_danang_gpkg():
    DANANG_DATA_DIR.mkdir(parents=True, exist_ok=True)
    cleanup_legacy_overture_artifacts()

    if DANANG_GPKG.exists():
        logger.info(f"Using existing Da Nang Overture GeoPackage: {DANANG_GPKG}")
        return

    if not DOWNLOAD_OVERTURE_IF_MISSING:
        logger.warning(
            "Da Nang Overture GeoPackage not found and GEOAI_DOWNLOAD_OVERTURE_IF_MISSING is disabled"
        )
        return

    logger.info(
        f"Da Nang Overture GeoPackage not found; downloading initial copy to {DANANG_GPKG}"
    )
    refresh_danang_gpkg()


def load_danang_gpkg_data(bbox_tuple):
    if not DANANG_GPKG.exists():
        return None

    danang_bbox = parse_bbox(os.getenv(DANANG_BBOX_ENV), DANANG_BBOX)
    if not bbox_intersects(bbox_tuple, danang_bbox):
        return None

    query_bounds = box(*bbox_tuple)
    logger.info(f"Reading local Da Nang GeoPackage for bbox: {bbox_tuple}")

    buildings_gdf = gpd.read_file(DANANG_GPKG, layer="buildings", bbox=bbox_tuple)
    infrastructure_gdf = gpd.read_file(DANANG_GPKG, layer="infrastructure", bbox=bbox_tuple)
    try:
        green_gdf = gpd.read_file(DANANG_GPKG, layer=GREEN_LAYER, bbox=bbox_tuple)
    except Exception as e:
        logger.warning(f"Could not read Da Nang green layer: {str(e)}")
        green_gdf = gpd.GeoDataFrame(geometry=[], crs="EPSG:4326")

    if not buildings_gdf.empty:
        buildings_gdf = buildings_gdf[buildings_gdf.geometry.intersects(query_bounds)]

    if not infrastructure_gdf.empty:
        infrastructure_gdf = infrastructure_gdf[
            infrastructure_gdf.geometry.intersects(query_bounds)
        ]

    if not green_gdf.empty:
        green_gdf = green_gdf[green_gdf.geometry.intersects(query_bounds)]

    return buildings_gdf, infrastructure_gdf, green_gdf


def fallback_admin_boundaries():
    records = []
    for admin_id, bbox_tuple in FALLBACK_DA_NANG_ZONES.items():
        records.append({
            "admin_id": admin_id,
            "name": FALLBACK_ZONE_LABELS.get(admin_id, admin_id),
            "geometry": box(*bbox_tuple),
        })

    return gpd.GeoDataFrame(records, crs="EPSG:4326")


def load_or_download_danang_admin_boundaries():
    global admin_boundaries_cache
    if admin_boundaries_cache is not None:
        return admin_boundaries_cache

    if DANANG_DISTRICTS_GEOJSON.exists():
        admin_boundaries_cache = gpd.read_file(DANANG_DISTRICTS_GEOJSON).to_crs("EPSG:4326")
        return admin_boundaries_cache

    DANANG_DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        logger.info("Downloading GADM Vietnam level 3 boundaries")
        response = requests.get(GADM_DANANG_URL, timeout=120)
        response.raise_for_status()
        archive = zipfile.ZipFile(io.BytesIO(response.content))
        gdf_all = gpd.read_file(archive.open(GADM_ZIP_MEMBER)).to_crs("EPSG:4326")
        danang = gdf_all[gdf_all["NAME_1"].map(compact_slug).eq("danang")].copy()

        if danang.empty:
            raise ValueError("Could not find Da Nang in GADM NAME_1")

        wards = danang[["NAME_2", "NAME_3", "geometry"]].copy()
        wards["district_id"] = wards["NAME_2"].map(slugify_name)
        wards["ward_id"] = wards.apply(
            lambda row: f"{row['district_id']}__{slugify_name(row['NAME_3'])}",
            axis=1,
        )
        wards.to_file(DANANG_WARDS_GEOJSON, driver="GeoJSON")

        districts = wards.dissolve(by="district_id", as_index=False)
        district_names = (
            wards.groupby("district_id")["NAME_2"]
            .first()
            .reset_index()
            .rename(columns={"NAME_2": "name"})
        )
        districts = districts.merge(district_names, on="district_id", how="left")
        districts = districts.rename(columns={"district_id": "admin_id"})
        districts = districts[["admin_id", "name", "geometry"]]
        districts.to_file(DANANG_DISTRICTS_GEOJSON, driver="GeoJSON")
        admin_boundaries_cache = districts.to_crs("EPSG:4326")
        logger.info(f"Saved Da Nang GADM district boundaries: {DANANG_DISTRICTS_GEOJSON}")
        return admin_boundaries_cache
    except Exception as e:
        logger.warning(f"Could not load GADM boundaries, using fallback bboxes: {str(e)}")
        admin_boundaries_cache = fallback_admin_boundaries()
        return admin_boundaries_cache


def get_admin_area(admin_area_id=None):
    admin_area_id = normalize_admin_area_id(admin_area_id)
    districts = load_or_download_danang_admin_boundaries()

    if admin_area_id in ("all", ALL_ADMIN_AREA):
        geometry = (
            districts.geometry.union_all()
            if hasattr(districts.geometry, "union_all")
            else districts.geometry.unary_union
        )
        return {
            "id": ALL_ADMIN_AREA,
            "name": "Đà Nẵng",
            "geometry": geometry,
            "districts": districts,
        }

    matched = districts[districts["admin_id"].eq(admin_area_id)]
    if matched.empty:
        return None

    row = matched.iloc[0]
    return {
        "id": row["admin_id"],
        "name": row["name"],
        "geometry": row.geometry,
        "districts": matched,
    }


def geotiff_path_for_zone(zone_name):
    return GEOTIFF_CACHE_DIR / f"{zone_name}_z{tile_zoom_for_zone(zone_name)}.tif"


def ai_buildings_gpkg_for_zone(zone_name):
    return AI_SCAN_DIR / f"zone_{zone_name}_z{tile_zoom_for_zone(zone_name)}" / "ai_buildings.gpkg"


def tile_zoom_for_zone(zone_name):
    return ZONE_TILE_ZOOMS.get(zone_name, AI_TILE_ZOOM)


def fast_filter_overlapping_polygons(self, gdf, nms_iou_threshold=None, **kwargs):
    if gdf is None or gdf.empty or len(gdf) <= 1:
        return gdf

    iou_threshold = kwargs.get(
        "nms_iou_threshold",
        nms_iou_threshold if nms_iou_threshold is not None else self.nms_iou_threshold,
    )
    logger.info(f"Filtering overlapping polygons with spatial index: input={len(gdf)}")

    filtered = gdf.sort_values("confidence", ascending=False).reset_index(drop=True).copy()
    filtered["geometry"] = filtered["geometry"].apply(
        lambda geom: geom.buffer(0) if geom is not None and not geom.is_valid else geom
    )
    filtered = filtered[filtered.geometry.notna() & ~filtered.geometry.is_empty].reset_index(drop=True)
    if filtered.empty:
        logger.info("Filtering overlapping polygons finished: output=0")
        return filtered

    spatial_index = filtered.sindex
    kept_positions = []
    kept_position_set = set()

    for position, geometry in enumerate(filtered.geometry.values):
        if geometry is None or geometry.is_empty or not geometry.is_valid:
            continue

        try:
            candidate_positions = spatial_index.query(geometry, predicate="intersects")
        except TypeError:
            candidate_positions = spatial_index.query(geometry)

        overlapping_kept = kept_position_set.intersection(int(candidate) for candidate in candidate_positions)
        should_keep = True
        for kept_position in overlapping_kept:
            kept_geometry = filtered.geometry.iloc[kept_position]
            if kept_geometry is None or kept_geometry.is_empty or not kept_geometry.is_valid:
                continue

            try:
                intersection_area = geometry.intersection(kept_geometry).area
                union_area = geometry.area + kept_geometry.area - intersection_area
                iou = intersection_area / union_area if union_area > 0 else 0
            except Exception:
                continue

            if iou > iou_threshold:
                should_keep = False
                break

        if should_keep:
            kept_positions.append(position)
            kept_position_set.add(position)

    result = filtered.iloc[kept_positions].copy()
    logger.info(f"Filtering overlapping polygons finished: output={len(result)}")
    return result


def get_building_extractor():
    global building_extractor_cache
    if building_extractor_cache is not None:
        return building_extractor_cache

    from geoai.extract import BuildingFootprintExtractor

    logger.info(f"Initializing GeoAI building model from {AI_MODEL_SOURCE}: {AI_MODEL_PATH}")
    building_extractor_cache = BuildingFootprintExtractor(
        model_path=AI_MODEL_PATH,
        device=AI_DEVICE,
    )
    building_extractor_cache.filter_overlapping_polygons = types.MethodType(
        fast_filter_overlapping_polygons,
        building_extractor_cache,
    )
    return building_extractor_cache


def preload_zone_geotiff(zone_name, zone_bbox):
    GEOTIFF_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    zone_zoom = tile_zoom_for_zone(zone_name)
    output = geotiff_path_for_zone(zone_name)
    if output.exists():
        logger.info(f"GeoTIFF cache hit: {zone_name} z{zone_zoom}")
        return output

    logger.info(f"Downloading GeoTIFF cache for {zone_name} z{zone_zoom}: {zone_bbox}")
    try:
        leafmap.map_tiles_to_geotiff(
            output=str(output),
            bbox=list(zone_bbox),
            zoom=zone_zoom,
            source=AI_TILE_SOURCE,
            overwrite=False,
            quiet=True,
        )
    except Exception as e:
        if AI_TILE_SOURCE == "Satellite":
            raise

        logger.warning(
            f"Tile source {AI_TILE_SOURCE} failed for {zone_name} ({str(e)}), retrying with Satellite"
        )
        leafmap.map_tiles_to_geotiff(
            output=str(output),
            bbox=list(zone_bbox),
            zoom=zone_zoom,
            source="Satellite",
            overwrite=False,
            quiet=True,
        )

    logger.info(f"GeoTIFF cache ready: {output}")
    return output


def preload_all_zone_geotiffs():
    logger.info("Pre-loading Da Nang zone GeoTIFF cache")
    for row in load_or_download_danang_admin_boundaries().itertuples(index=False):
        try:
            preload_zone_geotiff(row.admin_id, row.geometry.bounds)
        except Exception as e:
            logger.warning(f"Could not preload GeoTIFF for {row.admin_id}: {str(e)}")
    logger.info("Da Nang zone GeoTIFF cache ready")


def preload_all_ai_building_footprints():
    if not PRELOAD_AI_FOOTPRINTS:
        logger.info("AI footprint preload disabled by GEOAI_PRELOAD_AI_FOOTPRINTS")
        return

    logger.info("Pre-loading AI building footprints for Da Nang districts")
    try:
        get_building_extractor()
    except Exception as e:
        logger.warning(f"Could not initialize GeoAI building model during startup: {str(e)}")
        return

    for row in load_or_download_danang_admin_boundaries().itertuples(index=False):
        try:
            extract_buildings_from_zone(
                row.admin_id,
                row.geometry,
                row.geometry,
                allow_heavy=True,
            )
        except Exception as e:
            logger.warning(f"Could not preload AI buildings for {row.admin_id}: {str(e)}")
    logger.info("AI building footprint preload finished")


def preload_startup_resources():
    startup_steps = (
        ("Da Nang GADM boundaries", load_or_download_danang_admin_boundaries),
        ("Da Nang Overture GeoPackage", prepare_existing_danang_gpkg if PRELOAD_OVERTURE else lambda: logger.info("Overture preload disabled by GEOAI_PRELOAD_OVERTURE")),
        ("Da Nang GeoTIFF cache", preload_all_zone_geotiffs),
    )

    for step_name, step in startup_steps:
        try:
            logger.info(f"Startup preload: {step_name}")
            step()
        except Exception as e:
            logger.warning(f"Startup preload skipped {step_name}: {str(e)}")


def zones_intersecting_bbox(bbox_tuple):
    zones = []
    for row in load_or_download_danang_admin_boundaries().itertuples(index=False):
        clipped_bbox = clip_bbox(bbox_tuple, row.geometry.bounds)
        if clipped_bbox is not None:
            query_geometry = box(*bbox_tuple).intersection(row.geometry)
            if not query_geometry.is_empty:
                zones.append((row.admin_id, row.name, row.geometry, clipped_bbox, query_geometry))
    return zones


def clip_gdf_to_zone_coverage(gdf, bbox_tuple):
    if gdf is None or gdf.empty:
        return empty_geodataframe(getattr(gdf, "crs", "EPSG:4326"))

    clipped_parts = []
    for _, _, _, _, query_geometry in zones_intersecting_bbox(bbox_tuple):
        clipped_part = clip_gdf_to_geometry(gdf, query_geometry)
        if clipped_part is not None and not clipped_part.empty:
            clipped_parts.append(clipped_part)

    if not clipped_parts:
        return empty_geodataframe(getattr(gdf, "crs", "EPSG:4326"))

    clipped_gdf = gpd.GeoDataFrame(
        pd.concat(clipped_parts, ignore_index=True),
        crs=clipped_parts[0].crs,
    )
    clipped_gdf["_geometry_wkb"] = clipped_gdf.geometry.to_wkb(hex=True)
    clipped_gdf = clipped_gdf.drop_duplicates("_geometry_wkb").drop(columns="_geometry_wkb")
    return clipped_gdf


def extract_buildings_from_zone(zone_name, zone_geometry, query_geometry, allow_heavy=False):
    AI_SCAN_DIR.mkdir(parents=True, exist_ok=True)
    scan_dir = ai_buildings_gpkg_for_zone(zone_name).parent
    scan_dir.mkdir(parents=True, exist_ok=True)

    image_path = geotiff_path_for_zone(zone_name)
    buildings_gpkg = ai_buildings_gpkg_for_zone(zone_name)

    if buildings_gpkg.exists():
        try:
            buildings_gdf = gpd.read_file(buildings_gpkg, layer="buildings")
            logger.info(f"Loaded cached AI building footprints: {buildings_gpkg}")
            return select_gdf_intersecting_geometry(buildings_gdf.to_crs("EPSG:4326"), query_geometry)
        except Exception as e:
            logger.warning(f"Could not read cached AI buildings: {str(e)}")
            if not allow_heavy:
                return empty_geodataframe()
            buildings_gpkg.unlink(missing_ok=True)

    if not allow_heavy:
        logger.warning(
            f"AI building cache missing for {zone_name}; skipping runtime extraction"
        )
        return empty_geodataframe()

    if not image_path.exists():
        image_path = preload_zone_geotiff(zone_name, zone_geometry.bounds)

    extractor = get_building_extractor()
    logger.info(
        f"Starting GeoAI building extraction: zone={zone_name} "
        f"zoom={tile_zoom_for_zone(zone_name)} image={image_path}"
    )
    buildings_gdf = extractor.process_raster(
        str(image_path),
        batch_size=AI_BATCH_SIZE,
        confidence_threshold=AI_CONFIDENCE_THRESHOLD,
        overlap=AI_TILE_OVERLAP,
        mask_threshold=AI_MASK_THRESHOLD,
        simplify_tolerance=AI_SIMPLIFY_TOLERANCE,
        filter_edges=False,
    )
    logger.info(
        f"GeoAI building extraction returned for zone={zone_name}: "
        f"objects={0 if buildings_gdf is None else len(buildings_gdf)}"
    )

    if buildings_gdf is None or buildings_gdf.empty:
        buildings_gdf = empty_geodataframe()
    elif buildings_gdf.crs is None:
        buildings_gdf = buildings_gdf.set_crs("EPSG:4326")
    else:
        buildings_gdf = buildings_gdf.to_crs("EPSG:4326")

    buildings_gdf = clip_gdf_to_geometry(buildings_gdf, zone_geometry)
    if not buildings_gdf.empty:
        logger.info(f"Writing AI building footprints: zone={zone_name} output={buildings_gpkg}")
        buildings_gdf.to_file(buildings_gpkg, layer="buildings", driver="GPKG")
        logger.info(f"AI building footprints saved: {buildings_gpkg}")
    else:
        logger.info(f"AI building extraction returned no footprints for zone={zone_name}")
    return select_gdf_intersecting_geometry(buildings_gdf, query_geometry)


def extract_buildings_from_satellite(bbox_tuple, query_geometry, admin_area):
    if not ALLOW_RUNTIME_AI_EXTRACTION:
        logger.warning("Runtime GeoAI extraction disabled by GEOAI_ALLOW_RUNTIME_AI_EXTRACTION")
        return empty_geodataframe()

    zone_results = []
    candidate_districts = admin_area["districts"]
    context_geometry = buffer_geometry_meters(query_geometry, AI_CONTEXT_BUFFER_M).intersection(admin_area["geometry"])
    extractor = get_building_extractor()

    with tempfile.TemporaryDirectory(prefix="geoai_runtime_") as temp_dir:
        for row in candidate_districts.itertuples(index=False):
            zone_query_geometry = query_geometry.intersection(row.geometry)
            if zone_query_geometry.is_empty:
                continue

            zone_context_geometry = context_geometry.intersection(row.geometry)
            if zone_context_geometry.is_empty:
                continue

            logger.info(f"Running runtime GeoAI extraction for district={row.admin_id}")
            image_path = geotiff_path_for_zone(row.admin_id)
            if not image_path.exists():
                image_path = preload_zone_geotiff(row.admin_id, row.geometry.bounds)

            crop_path = crop_geotiff_to_geometry(
                image_path,
                zone_context_geometry,
                temp_dir,
                row.admin_id,
            )
            if crop_path is None:
                continue

            zone_gdf = extractor.process_raster(
                str(crop_path),
                batch_size=AI_BATCH_SIZE,
                confidence_threshold=AI_CONFIDENCE_THRESHOLD,
                overlap=AI_TILE_OVERLAP,
                mask_threshold=AI_MASK_THRESHOLD,
                simplify_tolerance=AI_SIMPLIFY_TOLERANCE,
                filter_edges=False,
            )
            if zone_gdf is None or zone_gdf.empty:
                continue

            if zone_gdf.crs is None:
                zone_gdf = zone_gdf.set_crs("EPSG:4326")
            else:
                zone_gdf = zone_gdf.to_crs("EPSG:4326")

            zone_gdf = select_gdf_intersecting_geometry(zone_gdf, zone_query_geometry)
            if not zone_gdf.empty:
                zone_results.append(zone_gdf)

    if not zone_results:
        return empty_geodataframe()

    buildings_gdf = gpd.GeoDataFrame(
        pd.concat(zone_results, ignore_index=True),
        crs=zone_results[0].crs,
    )
    buildings_gdf["_geometry_wkb"] = buildings_gdf.geometry.to_wkb(hex=True)
    buildings_gdf = buildings_gdf.drop_duplicates("_geometry_wkb").drop(columns="_geometry_wkb")
    buildings_gdf = select_gdf_intersecting_geometry(buildings_gdf, query_geometry)
    return snap_detections_to_reference_footprints(buildings_gdf, query_geometry)


def crop_geotiff_to_geometry(image_path, clip_geometry, temp_dir, zone_name):
    if clip_geometry is None or clip_geometry.is_empty:
        return None

    output_path = Path(temp_dir) / f"{zone_name}_runtime_crop.tif"

    with rasterio.open(image_path) as src:
        crop_geometry = mapping(clip_geometry)
        if src.crs:
            crop_geometry = transform_geom("EPSG:4326", src.crs, crop_geometry)

        try:
            out_image, out_transform = rasterio_mask(
                src,
                [crop_geometry],
                crop=True,
                filled=True,
            )
        except ValueError:
            logger.info(f"Runtime crop had no overlap for {zone_name}")
            return None

        out_meta = src.meta.copy()
        out_meta.update(
            {
                "driver": "GTiff",
                "height": out_image.shape[1],
                "width": out_image.shape[2],
                "transform": out_transform,
            }
        )

    with rasterio.open(output_path, "w", **out_meta) as dst:
        dst.write(out_image)

    return output_path


def geometry_area_m2(gdf):
    if gdf is None or gdf.empty:
        return 0

    try:
        projected = gdf.to_crs(gdf.estimate_utm_crs())
        return projected.geometry.area.sum()
    except Exception:
        return gdf.geometry.area.sum()


def object_boxes_from_gdf(gdf, object_type="building", limit=OBJECT_BOX_LIMIT):
    if gdf is None or gdf.empty:
        return []

    objects = []
    for index, row in gdf.head(limit).iterrows():
        if row.geometry is None or row.geometry.is_empty:
            continue

        min_lng, min_lat, max_lng, max_lat = row.geometry.bounds
        objects.append({
            "id": str(row.get("id", index)),
            "type": object_type,
            "bbox": [
                float(min_lng),
                float(min_lat),
                float(max_lng),
                float(max_lat),
            ],
            "geometry": mapping(row.geometry),
            "geometryType": row.geometry.geom_type,
            "geometrySource": str(row.get("source", "feature_geometry")),
        })

    return objects


def parse_scan_types(raw_value):
    return set(DEFAULT_SCAN_TYPES)


def filter_gdf_to_geometry(gdf, clip_geometry):
    if gdf is None or gdf.empty:
        return empty_geodataframe(getattr(gdf, "crs", "EPSG:4326"))

    filtered = gdf.to_crs("EPSG:4326") if gdf.crs else gdf.set_crs("EPSG:4326")
    return clip_gdf_to_geometry(filtered, clip_geometry)


def select_gdf_for_display(gdf, query_geometry):
    return select_gdf_intersecting_geometry(gdf, query_geometry)


def load_reference_building_footprints(query_geometry):
    if not AI_SNAP_TO_REFERENCE_FOOTPRINTS or not DANANG_GPKG.exists():
        return empty_geodataframe()
    if query_geometry is None or query_geometry.is_empty:
        return empty_geodataframe()

    try:
        search_geometry = buffer_geometry_meters(query_geometry, AI_CONTEXT_BUFFER_M)
        reference_gdf = gpd.read_file(
            DANANG_GPKG,
            layer="buildings",
            bbox=search_geometry.bounds,
        )
    except Exception as e:
        logger.warning(f"Could not read reference Overture footprints for snapping: {str(e)}")
        return empty_geodataframe()

    return select_gdf_intersecting_geometry(reference_gdf, search_geometry)


def snap_detections_to_reference_footprints(detections_gdf, query_geometry):
    if not AI_SNAP_TO_REFERENCE_FOOTPRINTS:
        return detections_gdf
    if detections_gdf is None or detections_gdf.empty:
        return detections_gdf

    reference_gdf = load_reference_building_footprints(query_geometry)
    if reference_gdf is None or reference_gdf.empty:
        return detections_gdf

    detections = detections_gdf.to_crs("EPSG:4326") if detections_gdf.crs else detections_gdf.set_crs("EPSG:4326")
    references = reference_gdf.to_crs("EPSG:4326") if reference_gdf.crs else reference_gdf.set_crs("EPSG:4326")
    spatial_index = references.sindex
    snapped_records = []

    for detection_index, detection_row in detections.iterrows():
        detection_geometry = detection_row.geometry
        if detection_geometry is None or detection_geometry.is_empty:
            continue

        try:
            candidate_positions = spatial_index.query(detection_geometry, predicate="intersects")
        except TypeError:
            candidate_positions = spatial_index.query(detection_geometry)

        best_row = None
        best_score = 0.0
        for candidate_position in candidate_positions:
            reference_row = references.iloc[int(candidate_position)]
            reference_geometry = reference_row.geometry
            if reference_geometry is None or reference_geometry.is_empty:
                continue

            try:
                intersection_area = detection_geometry.intersection(reference_geometry).area
                denominator = min(detection_geometry.area, reference_geometry.area)
                score = intersection_area / denominator if denominator > 0 else 0.0
            except Exception:
                continue

            if score > best_score:
                best_score = score
                best_row = reference_row

        if best_row is not None and best_score >= AI_REFERENCE_SNAP_MIN_OVERLAP:
            record = best_row.copy()
            record["geometry"] = best_row.geometry
            record["source"] = "overture_reference_footprint"
            record["snap_score"] = float(best_score)
            snapped_records.append(record)
            continue

        record = detection_row.copy()
        record["source"] = "geoai_mask"
        record["snap_score"] = 0.0
        snapped_records.append(record)

    if not snapped_records:
        return detections_gdf

    snapped_gdf = gpd.GeoDataFrame(snapped_records, crs="EPSG:4326")
    snapped_gdf = select_gdf_intersecting_geometry(snapped_gdf, query_geometry)
    if snapped_gdf.empty:
        return detections_gdf

    snapped_gdf["_geometry_wkb"] = snapped_gdf.geometry.to_wkb(hex=True)
    snapped_gdf = snapped_gdf.drop_duplicates("_geometry_wkb").drop(columns="_geometry_wkb")
    logger.info(
        f"Snapped GeoAI detections to reference footprints: input={len(detections_gdf)} output={len(snapped_gdf)}"
    )
    return snapped_gdf


def process_overture_analysis(image_array, bbox, scan_types=None, admin_area_id=None):
    logger.info("Starting Overture analysis")
    try:
        start_time = time.time()
        scan_types = scan_types or set(DEFAULT_SCAN_TYPES)
        height, width = image_array.shape[:2]

        if bbox and len(bbox) == 4:
            bbox_tuple = normalize_bbox(bbox)
        else:
            bbox_tuple = DEFAULT_BBOX
            bbox = list(bbox_tuple)

        admin_area = get_admin_area(admin_area_id)
        if admin_area is None:
            raise ValueError(f"Invalid admin area: {admin_area_id}")

        query_geometry = box(*bbox_tuple).intersection(admin_area["geometry"])
        has_valid_geometry = not query_geometry.is_empty
        effective_bbox = query_geometry.bounds if has_valid_geometry else bbox_tuple
        bbox_hash = admin_analysis_cache_key(
            bbox_tuple,
            scan_types,
            f"{admin_area['id']}:{SCAN_MODE_OVERTURE}:fullbuildings",
        )

        if bbox_hash in bbox_cache:
            analysis = bbox_cache[bbox_hash]
        else:
            overture_data = load_danang_gpkg_data(effective_bbox) if has_valid_geometry else None
            if overture_data is None:
                buildings_gdf = empty_geodataframe()
                infrastructure_gdf = empty_geodataframe()
                green_gdf = empty_geodataframe()
            else:
                buildings_gdf, infrastructure_gdf, green_gdf = overture_data
                buildings_gdf = select_gdf_for_display(buildings_gdf, query_geometry)
                infrastructure_gdf = filter_gdf_to_geometry(infrastructure_gdf, query_geometry)
                green_gdf = filter_gdf_to_geometry(green_gdf, query_geometry)

            analysis = analyze_geodataframes(
                buildings_gdf,
                infrastructure_gdf,
                green_gdf,
                effective_bbox,
                scan_types,
            )
            bbox_cache[bbox_hash] = analysis

        processing_time = time.time() - start_time
        return {
            'timestamp': datetime.now().isoformat(),
            'bbox': bbox,
            'effectiveBbox': list(effective_bbox),
            'validAreaHectares': round(shapely_area_m2(query_geometry) / 10_000, 2) if has_valid_geometry else 0,
            'adminArea': {
                'id': admin_area["id"],
                'name': admin_area["name"],
            },
            'imageSize': {
                'width': width,
                'height': height
            },
            'analysis': analysis,
            'scanTypes': sorted(scan_types),
            'scanMode': SCAN_MODE_OVERTURE,
            'confidence': 0.98,
            'processingTime': f'{processing_time:.2f}s',
            'dataSource': 'Overture Maps local GeoPackage'
        }
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"ERROR in process_overture_analysis: {str(e)}")
        logger.error("=" * 60, exc_info=True)
        logger.info("Falling back to fallback_analysis...")
        return get_fallback_analysis(image_array, bbox)


def row_text(row):
    values = []
    for key in ("subtype", "class", "names", "categories", "sources", "height", "level"):
        if key in row and row.get(key) is not None:
            values.append(str(row.get(key)).lower())
    return " ".join(values)


def split_industrial_buildings(buildings_gdf):
    if buildings_gdf is None or buildings_gdf.empty:
        empty = gpd.GeoDataFrame(geometry=[], crs=getattr(buildings_gdf, "crs", "EPSG:4326"))
        return empty, empty

    industrial_terms = (
        "factory",
        "industrial",
        "warehouse",
        "manufactur",
        "plant",
        "workshop",
        "works",
        "hangar",
    )
    mask = buildings_gdf.apply(
        lambda row: any(term in row_text(row) for term in industrial_terms),
        axis=1,
    )
    return buildings_gdf[~mask], buildings_gdf[mask]


def analyze_geodataframes(buildings_gdf, infrastructure_gdf, green_gdf, bbox_tuple, scan_types=None):
    scan_types = scan_types or set(DEFAULT_SCAN_TYPES)

    analysis = {
        'buildings': {'count': 0, 'averageArea': 0, 'totalArea': 0},
        'landUse': {'residential': 0, 'commercial': 0, 'industrial': 0, 'greenSpace': 0},
        'infrastructure': {'count': 0, 'roads': 0, 'utilities': 0},
        'green': {'count': 0, 'totalArea': 0},
        'vegetationIndex': 0,
        'buildingDensity': 0,
        'objects': []
    }

    if "building" in scan_types and buildings_gdf is not None and not buildings_gdf.empty:
        building_count = len(buildings_gdf)
        total_area = geometry_area_m2(buildings_gdf)
        avg_area = total_area / building_count if building_count else 0

        analysis['buildings'] = {
            'count': int(building_count),
            'averageArea': int(avg_area),
            'totalArea': int(total_area)
        }
        analysis['objects'].extend(object_boxes_from_gdf(buildings_gdf, "building"))

    bbox_area = (
        (bbox_tuple[2] - bbox_tuple[0])
        * (bbox_tuple[3] - bbox_tuple[1])
        * 111000
        * 111000
    )

    if bbox_area > 0:
        building_density = analysis['buildings']['totalArea'] / bbox_area
        building_density = min(building_density, 0.5)
        analysis['buildingDensity'] = round(building_density, 2)

        analysis['landUse'] = {
            'residential': int(40 * building_density + 20),
            'commercial': int(30 * building_density + 10),
            'industrial': int(15 * building_density + 5),
            'greenSpace': int(100 - (40 * building_density + 20) - (30 * building_density + 10) - (15 * building_density + 5))
        }

    total_land_use = sum(analysis['landUse'].values())
    if total_land_use > 0:
        for key in analysis['landUse']:
            analysis['landUse'][key] = int(analysis['landUse'][key] * 100 / total_land_use)

    return analysis


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'GeoAI Backend is running'}), 200


@app.route('/admin-boundaries', methods=['GET'])
def admin_boundaries():
    try:
        districts = load_or_download_danang_admin_boundaries().to_crs("EPSG:4326")
        features = json.loads(districts.to_json())
        return jsonify({
            'success': True,
            'districts': features,
            'defaultAdminArea': ALL_ADMIN_AREA,
        }), 200
    except Exception as e:
        logger.error(f"Error loading admin boundaries: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500


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
        scan_types = parse_scan_types(request.form.get('scanTypes'))
        admin_area_id = normalize_admin_area_id(request.form.get('adminArea') or DEFAULT_ADMIN_AREA)
        scan_mode = normalize_scan_mode(request.form.get('scanMode') or DEFAULT_SCAN_MODE)
        
        logger.info(f"📸 Image received: {image_file.filename}")
        logger.info(f"📍 Bbox string: {bbox_str}")
        
        # Parse bbox
        try:
            bbox = json.loads(bbox_str)
            logger.info(f"✅ Bbox parsed: {bbox}")
        except Exception as e:
            logger.warning(f"⚠️ Could not parse bbox: {e}")
            bbox = None
        
        if not bbox or len(bbox) != 4:
            return jsonify({
                'success': False,
                'error': 'Vui lòng chọn vùng quét trong địa phận Đà Nẵng'
            }), 400

        bbox_tuple = normalize_bbox(bbox)
        admin_area = get_admin_area(admin_area_id)
        if admin_area is None:
            return jsonify({
                'success': False,
                'error': 'Khu vực hành chính không hợp lệ'
            }), 400

        selected_geometry = box(*bbox_tuple).intersection(admin_area["geometry"])
        selected_area_m2 = shapely_area_m2(selected_geometry)
        if selected_area_m2 > MAX_SCAN_AREA_M2:
            return jsonify({
                'success': False,
                'error': f'Vùng quét trong {admin_area["name"]} tối đa 25 hecta. Phần hợp lệ hiện tại khoảng {selected_area_m2 / 10_000:.2f} hecta.'
            }), 400

        logger.info(f"Processing image: {image_file.filename}, bbox: {bbox}")
        
        # Read image
        img = Image.open(image_file)
        img_array = np.array(img)
        logger.info(f"📷 Image loaded: shape {img_array.shape}")
        
        # Process with GeoAI analysis
        logger.info(f"Starting analysis with mode={scan_mode}")
        if scan_mode == SCAN_MODE_OVERTURE:
            results = process_overture_analysis(img_array, bbox, scan_types, admin_area_id)
        else:
            results = process_geoai_analysis(img_array, bbox, scan_types, admin_area_id)
        
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


def process_geoai_analysis(image_array, bbox, scan_types=None, admin_area_id=None):
    """
    Process building analysis by running runtime GeoAI extraction on GeoTIFF crops.
    """
    logger.info("🔄 process_geoai_analysis() started")
    try:
        start_time = time.time()
        scan_types = scan_types or set(DEFAULT_SCAN_TYPES)
        
        # Image properties
        height, width = image_array.shape[:2]
        logger.info(f"📊 Image dimensions: {width}x{height}")
        
        # Convert bbox format if needed: [minLng, minLat, maxLng, maxLat]
        if bbox and len(bbox) == 4:
            bbox_tuple = normalize_bbox(bbox)  # (minLng, minLat, maxLng, maxLat)
            logger.info(f"✅ Valid bbox: {bbox_tuple}")
        else:
            logger.warning(f"⚠️ Invalid bbox format: {bbox}, using default")
            bbox_tuple = DEFAULT_BBOX
            bbox = list(bbox_tuple)
            logger.info(f"📍 Using default bbox: {bbox_tuple}")

        admin_area = get_admin_area(admin_area_id)
        if admin_area is None:
            raise ValueError(f"Invalid admin area: {admin_area_id}")

        query_geometry = box(*bbox_tuple).intersection(admin_area["geometry"])
        has_valid_geometry = not query_geometry.is_empty
        effective_bbox = query_geometry.bounds if has_valid_geometry else bbox_tuple
        
        logger.info(f"🌐 Processing GeoAI data for bbox: {bbox_tuple}, admin area: {admin_area['name']}")
        
        # Create bbox hash for caching
        bbox_hash = admin_analysis_cache_key(
            bbox_tuple,
            scan_types,
            (
                f"{admin_area['id']}:context{AI_CONTEXT_BUFFER_M}:"
                f"overlap{AI_TILE_OVERLAP}:mask{AI_MASK_THRESHOLD}:"
                f"simplify{AI_SIMPLIFY_TOLERANCE}:"
                f"snap{AI_SNAP_TO_REFERENCE_FOOTPRINTS}:"
                f"snapmin{AI_REFERENCE_SNAP_MIN_OVERLAP}"
            ),
        )
        logger.info(f"🔐 Bbox hash: {bbox_hash}")
        
        # Check cache first
        if bbox_hash in bbox_cache:
            logger.info(f"💾 CACHE HIT! Using cached GeoAI data for bbox hash {bbox_hash}")
            analysis = bbox_cache[bbox_hash]
        else:
            logger.info(f"💾 CACHE MISS! Need fresh data for {bbox_hash}")
            if has_valid_geometry:
                buildings_gdf = extract_buildings_from_satellite(
                    effective_bbox,
                    query_geometry,
                    admin_area,
                )
            else:
                buildings_gdf = empty_geodataframe()

            analysis = analyze_geodataframes(
                buildings_gdf,
                empty_geodataframe(),
                empty_geodataframe(),
                effective_bbox,
                scan_types,
            )
            # Cache the results
            bbox_cache[bbox_hash] = analysis
            logger.info(f"💾 Cached results for {bbox_hash}")
        
        processing_time = time.time() - start_time
        
        logger.info(f"✅ GeoAI analysis successful!")
        logger.info(f"📦 Analysis keys: {list(analysis.keys())}")
        
        return {
            'timestamp': datetime.now().isoformat(),
            'bbox': bbox,
            'effectiveBbox': list(effective_bbox),
            'validAreaHectares': round(shapely_area_m2(query_geometry) / 10_000, 2) if has_valid_geometry else 0,
            'adminArea': {
                'id': admin_area["id"],
                'name': admin_area["name"],
            },
            'imageSize': {
                'width': width,
                'height': height
            },
            'analysis': analysis,
            'scanTypes': sorted(scan_types),
            'scanMode': SCAN_MODE_GEOAI,
            'modelName': 'BuildingFootprintExtractor',
            'modelPath': AI_MODEL_PATH,
            'modelSource': AI_MODEL_SOURCE,
            'confidence': 0.92,
            'processingTime': f'{processing_time:.2f}s',
            'dataSource': 'Runtime GeoTIFF crop + GeoAI BuildingFootprintExtractor'
        }
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ ERROR in process_geoai_analysis: {str(e)}")
        logger.error("=" * 60, exc_info=True)
        # Return fallback analysis if real model fails
        logger.info("🔄 Falling back to fallback_analysis...")
        return get_fallback_analysis(image_array, bbox)


def download_and_analyze_real_data(bbox_tuple, bbox_hash, scan_types=None):
    """
    Download real building and infrastructure data using GeoAI model
    
    Args:
        bbox_tuple: (minLng, minLat, maxLng, maxLat)
        bbox_hash: Hash for caching
        
    Returns:
        Dictionary with real analysis results
    """
    logger.info("=" * 60)
    logger.info(f"🔄 download_and_analyze_real_data({bbox_hash}) started")
    logger.info("=" * 60)
    
    try:
        scan_types = scan_types or set(DEFAULT_SCAN_TYPES)
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
        green_gdf = gpd.GeoDataFrame(geometry=[], crs="EPSG:4326")
        analysis = analyze_geodataframes(buildings_gdf, infrastructure_gdf, green_gdf, bbox_tuple, scan_types)
        
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
        bbox_tuple = normalize_bbox(bbox)
        bbox_hash = bbox_hash_for(bbox_tuple)
        
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
    preload_startup_resources()
    logger.info("Starting GeoAI Backend Server")
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
