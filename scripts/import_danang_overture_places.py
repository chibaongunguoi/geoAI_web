"""Import Da Nang Overture Places POIs into the local SQLite Place table.

Dry run:
  .venv310\\Scripts\\python.exe scripts\\import_danang_overture_places.py --dry-run

Full import:
  .venv310\\Scripts\\python.exe scripts\\import_danang_overture_places.py
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from dataclasses import astuple, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import overturemaps
from shapely import wkb
from shapely.geometry import mapping

from import_danang_overture_buildings import (
    DEFAULT_WARDS,
    WardBoundary,
    assign_ward,
    clean_string,
    load_dotenv,
    load_ward_boundaries,
)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BBOX = (107.82, 15.88, 108.35, 16.20)
DEFAULT_BATCH_SIZE = 500
DEFAULT_CATEGORIES = [
    "restaurant",
    "cafe",
    "bar",
    "hotel",
    "accommodation",
    "school",
    "kindergarten",
    "university",
    "hospital",
    "clinic",
    "pharmacy",
    "supermarket",
    "market",
    "convenience_store",
    "bank",
    "atm",
    "post_office",
    "police",
    "fire_station",
    "gas_station",
    "temple",
    "park",
    "playground",
    "swimming_pool",
    "sports_centre",
]

UPSERT_SQL = """
INSERT INTO "Place" (
    "id",
    "overtureId",
    "name",
    "category",
    "subcategories",
    "address",
    "street",
    "ward",
    "district",
    "city",
    "latitude",
    "longitude",
    "geometry",
    "confidence",
    "source",
    "sourceVersion",
    "createdAt",
    "updatedAt"
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("overtureId") DO UPDATE SET
    "name" = EXCLUDED."name",
    "category" = EXCLUDED."category",
    "subcategories" = EXCLUDED."subcategories",
    "address" = EXCLUDED."address",
    "street" = EXCLUDED."street",
    "ward" = EXCLUDED."ward",
    "district" = EXCLUDED."district",
    "city" = EXCLUDED."city",
    "latitude" = EXCLUDED."latitude",
    "longitude" = EXCLUDED."longitude",
    "geometry" = EXCLUDED."geometry",
    "confidence" = EXCLUDED."confidence",
    "source" = EXCLUDED."source",
    "sourceVersion" = EXCLUDED."sourceVersion",
    "updatedAt" = CURRENT_TIMESTAMP
"""


@dataclass(frozen=True)
class PlaceRow:
    id: str
    overture_id: str
    name: str
    category: str
    subcategories: str
    address: str | None
    street: str | None
    ward: str
    district: str
    city: str
    latitude: float
    longitude: float
    geometry: str
    confidence: float
    source: str
    source_version: str


def compact_id(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", value).lower()


def place_id(overture_id: str) -> str:
    return f"place_{compact_id(overture_id)}"


def first_name(names: Any) -> str | None:
    if isinstance(names, dict):
        primary = clean_string(names.get("primary"))
        if primary:
            return primary
        common = names.get("common")
        if isinstance(common, dict):
            for key in ("vi", "en"):
                value = clean_string(common.get(key))
                if value:
                    return value
    return clean_string(names)


def place_categories(row: dict[str, Any]) -> tuple[str | None, list[str]]:
    categories = row.get("categories")
    taxonomy = row.get("taxonomy")
    primary = None
    alternates: list[str] = []

    if isinstance(categories, dict):
        primary = clean_string(categories.get("primary"))
        alternate = categories.get("alternate")
        if isinstance(alternate, list):
            alternates.extend(clean_string(item) for item in alternate if clean_string(item))

    if not primary:
        primary = clean_string(row.get("basic_category"))

    if isinstance(taxonomy, dict):
        primary = primary or clean_string(taxonomy.get("primary"))
        hierarchy = taxonomy.get("hierarchy")
        if isinstance(hierarchy, list):
            alternates.extend(clean_string(item) for item in hierarchy if clean_string(item))
        taxonomy_alternates = taxonomy.get("alternates")
        if isinstance(taxonomy_alternates, list):
            alternates.extend(clean_string(item) for item in taxonomy_alternates if clean_string(item))

    unique_alternates = []
    for item in alternates:
        if item and item != primary and item not in unique_alternates:
            unique_alternates.append(item)

    return primary, unique_alternates


def first_address(addresses: Any) -> tuple[str | None, str | None, str | None]:
    if not isinstance(addresses, list) or not addresses:
        return None, None, None

    address = addresses[0]
    if not isinstance(address, dict):
        return None, None, None

    freeform = clean_string(address.get("freeform"))
    locality = clean_string(address.get("locality"))
    country = clean_string(address.get("country"))
    return freeform, locality, country


def category_allowed(category: str, alternates: Iterable[str], allowed: set[str]) -> bool:
    if not allowed:
        return True
    values = {category, *alternates}
    return bool(values & allowed)


def stage_row(raw: dict[str, Any], wards: list[WardBoundary], allowed_categories: set[str], source_version: str) -> PlaceRow | None:
    overture_id = clean_string(raw.get("id"))
    if not overture_id:
        return None

    geometry_payload = raw.get("geometry")
    if not geometry_payload:
        return None

    geometry = wkb.loads(geometry_payload)
    if geometry.is_empty:
        return None

    point = geometry.representative_point()
    ward = assign_ward(point, wards)
    if not ward:
        return None

    category, alternates = place_categories(raw)
    if not category or not category_allowed(category, alternates, allowed_categories):
        return None

    name = first_name(raw.get("names"))
    if not name:
        return None

    address, street, country = first_address(raw.get("addresses"))
    if country and country.upper() != "VN":
        return None

    return PlaceRow(
        id=place_id(overture_id),
        overture_id=overture_id,
        name=name,
        category=category,
        subcategories=json.dumps(alternates, ensure_ascii=False),
        address=address,
        street=street,
        ward=ward.ward,
        district=ward.district,
        city="Da Nang",
        latitude=round(float(point.y), 8),
        longitude=round(float(point.x), 8),
        geometry=json.dumps(mapping(geometry), ensure_ascii=False),
        confidence=float(raw.get("confidence") or 0),
        source="overture-places",
        source_version=source_version,
    )


def parse_bbox(value: str | None) -> tuple[float, float, float, float]:
    if not value:
        return DEFAULT_BBOX
    parts = [float(part.strip()) for part in value.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox must be xmin,ymin,xmax,ymax")
    return parts[0], parts[1], parts[2], parts[3]


def connect_database() -> sqlite3.Connection:
    load_dotenv(ROOT / "apps" / "api" / ".env")
    load_dotenv(ROOT / ".env")
    return sqlite3.connect(ROOT / "geoai_data" / "geoai.db")


def insert_batch(connection: sqlite3.Connection, rows: list[PlaceRow]) -> None:
    if not rows:
        return
    with connection:
        connection.executemany(UPSERT_SQL, [astuple(row) for row in rows])


def iter_overture_places(bbox: tuple[float, float, float, float], release: str | None, limit: int | None):
    reader = overturemaps.record_batch_reader(
        "place",
        bbox=bbox,
        release=release,
        connect_timeout=30,
        request_timeout=120,
    )
    if reader is None:
        return

    seen = 0
    for batch in reader:
        for row in batch.to_pylist():
            if limit is not None and seen >= limit:
                return
            seen += 1
            yield row


def run(args: argparse.Namespace) -> int:
    source_version = args.source_version or datetime.now(timezone.utc).date().isoformat()
    bbox = parse_bbox(args.bbox)
    allowed_categories = set(args.category or DEFAULT_CATEGORIES)
    wards = load_ward_boundaries(args.wards)
    imported = 0
    skipped = 0
    batch: list[PlaceRow] = []

    connection = None if args.dry_run else connect_database()
    try:
        for raw in iter_overture_places(bbox, args.release, args.limit):
            try:
                row = stage_row(raw, wards, allowed_categories, source_version)
            except Exception:
                row = None

            if row is None:
                skipped += 1
                continue

            imported += 1
            batch.append(row)

            if len(batch) >= args.batch_size:
                if connection is not None:
                    insert_batch(connection, batch)
                print(json.dumps({"stage": "places", "rows": imported, "skipped": skipped}, ensure_ascii=False), flush=True)
                batch.clear()

        if batch:
            if connection is not None:
                insert_batch(connection, batch)
            print(json.dumps({"stage": "places", "rows": imported, "skipped": skipped}, ensure_ascii=False), flush=True)

        print(json.dumps({
            "imported": imported,
            "skipped": skipped,
            "dryRun": args.dry_run,
            "sourceVersion": source_version,
            "bbox": bbox,
        }, ensure_ascii=False))
        return 0
    finally:
        if connection is not None:
            connection.close()


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Overture Places POIs for Da Nang into SQLite.")
    parser.add_argument("--bbox", default=os.getenv("GEOAI_DANANG_BBOX"), help="xmin,ymin,xmax,ymax; defaults to Da Nang.")
    parser.add_argument("--wards", type=Path, default=DEFAULT_WARDS)
    parser.add_argument("--release", default=os.getenv("OVERTURE_RELEASE"))
    parser.add_argument("--source-version", default=os.getenv("GEOAI_OVERTURE_PLACES_SOURCE_VERSION"))
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--category", action="append", help="Only import this Overture category. Can be repeated.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    return run(parse_args(argv or sys.argv[1:]))


if __name__ == "__main__":
    raise SystemExit(main())
