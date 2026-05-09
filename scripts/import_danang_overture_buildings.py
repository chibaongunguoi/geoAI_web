"""Bulk import ward-clipped Da Nang Overture buildings into SQLite.

Dry run:
  .venv310\\Scripts\\python.exe scripts\\import_danang_overture_buildings.py --dry-run

Full import:
  .venv310\\Scripts\\python.exe scripts\\import_danang_overture_buildings.py
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import sys
import time
import unicodedata
from collections import Counter
from dataclasses import astuple, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator
import sqlite3

import fiona
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GPKG = ROOT / "geoai_data" / "danang" / "overture_danang.gpkg"
DEFAULT_WARDS = ROOT / "geoai_data" / "danang" / "gadm41_danang_wards.geojson"
DEFAULT_BATCH_SIZE = 1000

UPSERT_SQL = """
INSERT INTO "BuildingProperty" (
    "id",
    "code",
    "overtureId",
    "name",
    "addressLine",
    "street",
    "ward",
    "district",
    "city",
    "propertyType",
    "status",
    "source",
    "sourceVersion",
    "level",
    "height",
    "floors",
    "areaSqm",
    "centroidLat",
    "centroidLng",
    "bbox",
    "geometry",
    "attributes",
    "searchText",
    "searchTextNormalized",
    "createdAt",
    "updatedAt"
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("overtureId") DO UPDATE SET
    "name" = COALESCE("BuildingProperty"."name", EXCLUDED."name"),
    "addressLine" = COALESCE("BuildingProperty"."addressLine", EXCLUDED."addressLine"),
    "street" = COALESCE("BuildingProperty"."street", EXCLUDED."street"),
    "sourceVersion" = EXCLUDED."sourceVersion",
    "level" = EXCLUDED."level",
    "height" = EXCLUDED."height",
    "floors" = EXCLUDED."floors",
    "areaSqm" = EXCLUDED."areaSqm",
    "bbox" = EXCLUDED."bbox",
    "geometry" = EXCLUDED."geometry",
    "attributes" = EXCLUDED."attributes",
    "centroidLat" = EXCLUDED."centroidLat",
    "centroidLng" = EXCLUDED."centroidLng",
    "ward" = EXCLUDED."ward",
    "district" = EXCLUDED."district",
    "city" = EXCLUDED."city",
    "propertyType" = EXCLUDED."propertyType",
    "source" = EXCLUDED."source",
    "searchText" = EXCLUDED."searchText",
    "searchTextNormalized" = EXCLUDED."searchTextNormalized",
    "updatedAt" = CURRENT_TIMESTAMP
"""

@dataclass(frozen=True)
class WardBoundary:
    district: str
    ward: str
    geometry: BaseGeometry


@dataclass(frozen=True)
class BuildingPropertyRow:
    id: str
    code: str
    overture_id: str
    name: str | None
    address_line: str | None
    street: str | None
    ward: str
    district: str
    city: str
    property_type: str
    status: str
    source: str
    source_version: str
    level: float | None
    height: float | None
    floors: int | None
    area_sqm: float | None
    centroid_lat: float
    centroid_lng: float
    bbox: str
    geometry: str
    attributes: str
    search_text: str
    search_text_normalized: str


@dataclass(frozen=True)
class DryRunSummary:
    raw_layer_count: int
    scanned_count: int
    importable_count: int
    outside_scope_count: int
    skipped_invalid_count: int
    district_counts: dict[str, int]
    source_version: str


@dataclass(frozen=True)
class ImportResult:
    imported: int
    outside_scope: int
    skipped_invalid: int
    source_version: str


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        text = line.strip()
        if not text or text.startswith("#") or "=" not in text:
            continue

        key, value = text.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def clean_string(value: Any) -> str | None:
    if value is None or is_nan(value):
        return None

    text = str(value).strip()
    return text or None


def is_nan(value: Any) -> bool:
    try:
        return value != value
    except Exception:
        return False


def insert_case_spaces(text: str) -> str:
    chars: list[str] = []
    previous = ""

    for char in text:
        if previous and previous.islower() and char.isupper():
            chars.append(" ")
        chars.append(char)
        previous = char

    return "".join(chars)


def split_admin_name(value: Any) -> str | None:
    text = clean_string(value)
    if not text:
        return None

    return " ".join(insert_case_spaces(text).split())


def normalize_search_text(value: str) -> str:
    text = insert_case_spaces(value)
    text = text.replace("\u0111", "d").replace("\u0110", "D")
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text).lower()
    return " ".join(text.split())


def normalized_filter_values(values: list[str] | None) -> set[str]:
    if not values:
        return set()

    filters: set[str] = set()
    for value in values:
        for item in value.split(","):
            normalized = normalize_search_text(item)
            if normalized:
                filters.add(normalized)

    return filters


def parse_names(value: Any) -> Any:
    if value is None or is_nan(value):
        return None

    if isinstance(value, dict):
        return value

    text = str(value).strip()
    if not text:
        return None

    try:
        return ast.literal_eval(text)
    except (SyntaxError, ValueError):
        return {"primary": text}


def primary_name(value: Any) -> str | None:
    names = parse_names(value)

    if isinstance(names, dict):
        return clean_string(names.get("primary"))

    return clean_string(names)


def number_or_none(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    if number != number:
        return None

    return number


def int_or_none(value: Any) -> int | None:
    number = number_or_none(value)
    return None if number is None else int(number)


def json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return None if is_nan(value) else value

    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items() if json_safe(item) is not None}

    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value if json_safe(item) is not None]

    return str(value)


def overture_code(overture_id: str) -> str:
    compact = re.sub(r"[^A-Za-z0-9]", "", overture_id).upper()
    return f"DN-OVT-{compact}"


def load_ward_boundaries(path: Path) -> list[WardBoundary]:
    boundaries: list[WardBoundary] = []

    with fiona.open(path) as source:
        for feature in source:
            properties = dict(feature.get("properties") or {})
            district = split_admin_name(properties.get("NAME_2"))
            ward = split_admin_name(properties.get("NAME_3"))

            if not district or not ward:
                continue

            boundaries.append(
                WardBoundary(
                    district=district,
                    ward=ward,
                    geometry=shape(feature["geometry"]),
                )
            )

    return boundaries


def assign_ward(geometry: BaseGeometry, wards: Iterable[WardBoundary]) -> WardBoundary | None:
    point = geometry.representative_point()

    for ward in wards:
        if ward.geometry.covers(point):
            return ward

    return None


def stage_row_from_feature(
    feature: dict[str, Any],
    wards: Iterable[WardBoundary],
    source_version: str,
) -> BuildingPropertyRow | None:
    properties = dict(feature.get("properties") or {})
    overture_id = clean_string(properties.get("id")) or clean_string(feature.get("id"))

    if not overture_id:
        return None

    geometry_payload = feature.get("geometry")
    if not geometry_payload:
        return None

    geometry = shape(geometry_payload)
    if geometry.is_empty:
        return None

    ward = assign_ward(geometry, wards)
    if not ward:
        return None

    centroid = geometry.representative_point()
    xmin, ymin, xmax, ymax = geometry.bounds
    code = overture_code(overture_id)
    search_text = " ".join(
        item
        for item in [
            code,
            overture_id,
            ward.ward,
            ward.district,
            "Da Nang",
            "building",
            "ACTIVE",
            "overture",
        ]
        if item
    )
    
    compact = overture_id.replace("-", "").lower()
    row_id = f"ovt_{compact}"

    return BuildingPropertyRow(
        id=row_id,
        code=code,
        overture_id=overture_id,
        name=None,
        address_line=None,
        street=None,
        ward=ward.ward,
        district=ward.district,
        city="Da Nang",
        property_type="building",
        status="ACTIVE",
        source="overture",
        source_version=source_version,
        level=number_or_none(properties.get("level")),
        height=number_or_none(properties.get("height")),
        floors=int_or_none(properties.get("num_floors")),
        area_sqm=number_or_none(properties.get("areaSqm") or properties.get("area_sqm")),
        centroid_lat=round(float(centroid.y), 6),
        centroid_lng=round(float(centroid.x), 6),
        bbox=json.dumps({"xmin": xmin, "ymin": ymin, "xmax": xmax, "ymax": ymax}, ensure_ascii=False),
        geometry=json.dumps(json_safe(geometry_payload), ensure_ascii=False),
        attributes=json.dumps({
            "trustedColumnsOnly": True,
            "adminBoundarySource": "GADM 4.1",
            "geometrySource": "Overture Maps buildings",
        }, ensure_ascii=False),
        search_text=search_text,
        search_text_normalized=normalize_search_text(search_text),
    )


def row_matches_filters(
    row: BuildingPropertyRow,
    districts: set[str] | None = None,
    wards: set[str] | None = None,
) -> bool:
    district_filters = districts or set()
    ward_filters = wards or set()

    if district_filters and normalize_search_text(row.district) not in district_filters:
        return False

    if ward_filters and normalize_search_text(row.ward) not in ward_filters:
        return False

    return True


def iter_overture_features(gpkg_path: Path, limit: int | None = None) -> Iterator[dict[str, Any]]:
    with fiona.open(gpkg_path, layer="buildings") as source:
        for index, feature in enumerate(source):
            if limit is not None and index >= limit:
                break

            yield {
                "id": (feature.get("properties") or {}).get("id") or feature.get("id"),
                "geometry": feature.get("geometry"),
                "properties": dict(feature.get("properties") or {}),
            }


def raw_layer_count(gpkg_path: Path) -> int:
    with fiona.open(gpkg_path, layer="buildings") as source:
        return len(source)


def dry_run_summary(
    features: Iterable[dict[str, Any]],
    wards: list[WardBoundary],
    source_version: str,
    raw_layer_count: int,
    districts: set[str] | None = None,
    ward_filters: set[str] | None = None,
) -> DryRunSummary:
    scanned = 0
    importable = 0
    skipped_invalid = 0
    district_counts: Counter[str] = Counter()

    for feature in features:
        scanned += 1
        try:
            row = stage_row_from_feature(feature, wards, source_version)
        except Exception:
            skipped_invalid += 1
            continue

        if not row:
            continue

        if not row_matches_filters(row, districts, ward_filters):
            continue

        importable += 1
        district_counts[row.district] += 1

    return DryRunSummary(
        raw_layer_count=raw_layer_count,
        scanned_count=scanned,
        importable_count=importable,
        outside_scope_count=scanned - importable - skipped_invalid,
        skipped_invalid_count=skipped_invalid,
        district_counts=dict(sorted(district_counts.items())),
        source_version=source_version,
    )


def connect_database() -> sqlite3.Connection:
    load_dotenv(ROOT / ".env")
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    if database_url.startswith("file:"):
        # The env var is relative to schema.prisma, so we just use the ROOT resolution.
        db_path = ROOT / "geoai_data" / "geoai.db"
    else:
        db_path = ROOT / "geoai_data" / "geoai.db"

    return sqlite3.connect(db_path)


def verify_import(connection: sqlite3.Connection, expected_importable_count: int | None = None) -> dict[str, int]:
    cursor = connection.cursor()
    cursor.execute("""SELECT COUNT(*) FROM "BuildingProperty" WHERE source = 'overture'""")
    overture_count = int(cursor.fetchone()[0])
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM (
          SELECT "overtureId"
          FROM "BuildingProperty"
          WHERE source = 'overture'
          GROUP BY "overtureId"
          HAVING COUNT(*) > 1
        )
        """
    )
    duplicate_overture_ids = int(cursor.fetchone()[0])
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM "BuildingProperty"
        WHERE source = 'overture'
          AND ("ward" IS NULL OR "district" IS NULL)
        """
    )
    missing_admin = int(cursor.fetchone()[0])

    result = {
        "overtureCount": overture_count,
        "duplicateOvertureIds": duplicate_overture_ids,
        "missingAdmin": missing_admin,
    }

    if expected_importable_count is not None:
        result["expectedImportableCount"] = expected_importable_count

    return result


def import_features(
    connection: sqlite3.Connection,
    features: Iterable[dict[str, Any]],
    wards: list[WardBoundary],
    source_version: str,
    batch_size: int,
    districts: set[str] | None = None,
    ward_filters: set[str] | None = None,
) -> tuple[int, int, int]:
    imported = 0
    outside_scope = 0
    skipped_invalid = 0
    batch: list[BuildingPropertyRow] = []

    for feature in features:
        try:
            row = stage_row_from_feature(feature, wards, source_version)
        except Exception:
            skipped_invalid += 1
            continue

        if not row:
            outside_scope += 1
            continue

        if not row_matches_filters(row, districts, ward_filters):
            outside_scope += 1
            continue

        batch.append(row)
        if len(batch) >= batch_size:
            insert_batch(connection, batch)
            imported += len(batch)
            print(json.dumps({"stage": "imported", "rows": imported, "outsideScope": outside_scope}), flush=True)
            batch.clear()

    if batch:
        insert_batch(connection, batch)
        imported += len(batch)
        print(json.dumps({"stage": "imported", "rows": imported, "outsideScope": outside_scope}), flush=True)

    return imported, outside_scope, skipped_invalid


def insert_batch(connection: sqlite3.Connection, rows: list[BuildingPropertyRow]) -> None:
    if not rows:
        return

    params = [astuple(row) for row in rows]
    with connection:
        connection.executemany(UPSERT_SQL, params)


def run_import(args: argparse.Namespace) -> int:
    source_version = args.source_version or datetime.now(timezone.utc).date().isoformat()
    district_filters = normalized_filter_values(args.districts)
    ward_filters = normalized_filter_values(args.wards_filter)
    wards = load_ward_boundaries(args.wards)
    raw_count = raw_layer_count(args.gpkg)
    features = iter_overture_features(args.gpkg, args.limit)

    if args.dry_run:
        started = time.time()
        summary = dry_run_summary(
            features,
            wards,
            source_version,
            raw_count if args.limit is None else min(raw_count, args.limit),
            district_filters,
            ward_filters,
        )
        print(json.dumps({**summary.__dict__, "elapsedSeconds": round(time.time() - started, 2)}, ensure_ascii=False))
        return 0

    connection = connect_database()

    try:
        imported, outside_scope, skipped_invalid = import_features(
            connection,
            features,
            wards,
            source_version,
            args.batch_size,
            district_filters,
            ward_filters,
        )

        verification = verify_import(connection, imported if imported > 0 else None)
        result = ImportResult(
            imported=imported,
            outside_scope=outside_scope,
            skipped_invalid=skipped_invalid,
            source_version=source_version,
        )
        print(json.dumps({**result.__dict__, "verification": verification}, ensure_ascii=False))
        return 0
    finally:
        connection.close()


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gpkg", type=Path, default=DEFAULT_GPKG)
    parser.add_argument("--wards", type=Path, default=DEFAULT_WARDS)
    parser.add_argument("--source-version", default=os.getenv("GEOAI_OVERTURE_SOURCE_VERSION"))
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--district",
        action="append",
        dest="districts",
        help="Only import matching district names. Can be repeated or comma-separated.",
    )
    parser.add_argument(
        "--ward",
        action="append",
        dest="wards_filter",
        help="Only import matching ward names. Can be repeated or comma-separated.",
    )
    parser.add_argument(
        "--expected-importable-count",
        type=int,
        help="Optional storage preflight target from a prior --dry-run. Ignored for SQLite.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    return run_import(parse_args(argv or sys.argv[1:]))


if __name__ == "__main__":
    raise SystemExit(main())
