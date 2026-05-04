"""Bulk import ward-clipped Da Nang Overture buildings into PostgreSQL.

Dry run:
  .venv310\\Scripts\\python.exe scripts\\import_danang_overture_buildings.py --dry-run

Full import:
  .venv310\\Scripts\\python.exe scripts\\import_danang_overture_buildings.py

Resume a staged/upsert import:
  .venv310\\Scripts\\python.exe scripts\\import_danang_overture_buildings.py --resume
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

import fiona
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GPKG = ROOT / "geoai_data" / "danang" / "overture_danang.gpkg"
DEFAULT_WARDS = ROOT / "geoai_data" / "danang" / "gadm41_danang_wards.geojson"
DEFAULT_BATCH_SIZE = 5000
IMPORT_LOCK_ID = 2026050401
IMPORT_STATE_KEY = "danang_overture_buildings"

STAGE_COLUMNS = [
    "code",
    "overture_id",
    "name",
    "address_line",
    "street",
    "ward",
    "district",
    "city",
    "property_type",
    "status",
    "source",
    "source_version",
    "level",
    "height",
    "floors",
    "area_sqm",
    "centroid_lat",
    "centroid_lng",
    "bbox",
    "geometry",
    "attributes",
    "search_text",
    "search_text_normalized",
]

CREATE_STAGE_SQL = """
CREATE UNLOGGED TABLE IF NOT EXISTS building_property_import_stage (
  stage_id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  overture_id TEXT NOT NULL,
  name TEXT,
  address_line TEXT,
  street TEXT,
  ward TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  property_type TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  source_version TEXT,
  level DOUBLE PRECISION,
  height DOUBLE PRECISION,
  floors INTEGER,
  area_sqm DOUBLE PRECISION,
  centroid_lat DOUBLE PRECISION,
  centroid_lng DOUBLE PRECISION,
  bbox JSONB,
  geometry JSONB,
  attributes JSONB,
  search_text TEXT NOT NULL,
  search_text_normalized TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS building_property_import_stage_overture_id_idx
  ON building_property_import_stage (overture_id);
"""

CREATE_STATE_SQL = """
CREATE TABLE IF NOT EXISTS building_property_import_state (
  key TEXT PRIMARY KEY,
  last_stage_id BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

def stage_placeholders() -> str:
    placeholders = ["%s"] * len(STAGE_COLUMNS)
    for index in (18, 19, 20):
        placeholders[index] = "%s::jsonb"
    return ", ".join(placeholders)


INSERT_STAGE_SQL = f"""
INSERT INTO building_property_import_stage ({", ".join(STAGE_COLUMNS)})
VALUES ({stage_placeholders()})
"""

UPSERT_SQL = """
WITH batch AS (
  SELECT *
  FROM building_property_import_stage
  WHERE stage_id > %s
  ORDER BY stage_id
  LIMIT %s
),
existing AS (
  SELECT COUNT(*)::INTEGER AS existing_count
  FROM batch
  JOIN "BuildingProperty"
    ON "BuildingProperty"."overtureId" = batch.overture_id
),
upserted AS (
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
  SELECT
    concat('ovt_', lower(replace(overture_id, '-', ''))),
    code,
    overture_id,
    name,
    address_line,
    street,
    ward,
    district,
    city,
    property_type,
    status,
    source,
    source_version,
    level,
    height,
    floors,
    area_sqm,
    centroid_lat,
    centroid_lng,
    bbox,
    geometry,
    attributes,
    search_text,
    search_text_normalized,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM batch
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
  RETURNING 1
),
progress AS (
  SELECT
    COALESCE(MAX(stage_id), %s)::BIGINT AS max_stage_id,
    COUNT(*)::INTEGER AS rows_seen
  FROM batch
)
SELECT
  progress.max_stage_id,
  progress.rows_seen,
  (SELECT COUNT(*)::INTEGER FROM upserted) AS upserted_count,
  (SELECT existing_count FROM existing) AS existing_count
FROM progress;
"""


@dataclass(frozen=True)
class WardBoundary:
    district: str
    ward: str
    geometry: BaseGeometry


@dataclass(frozen=True)
class BuildingStageRow:
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
    bbox: dict[str, float]
    geometry: dict[str, Any]
    attributes: dict[str, Any]
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
    staged: int
    created: int
    updated: int
    imported: int
    outside_scope: int
    skipped_invalid: int
    source_version: str


@dataclass(frozen=True)
class StorageSnapshot:
    max_bytes: int | None
    db_bytes: int
    property_bytes: int
    stage_bytes: int
    property_row_count: int
    overture_count: int


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        text = line.strip()
        if not text or text.startswith("#") or "=" not in text:
            continue

        key, value = text.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def import_psycopg():
    try:
        import psycopg  # type: ignore
    except ImportError as error:
        raise RuntimeError(
            "psycopg is required for direct PostgreSQL import. "
            "Install with: .venv310\\Scripts\\python.exe -m pip install \"psycopg[binary]\""
        ) from error

    return psycopg


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
) -> BuildingStageRow | None:
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
    name = primary_name(properties.get("names"))
    address_line = clean_string(properties.get("addressLine") or properties.get("address_line"))
    street = clean_string(properties.get("street"))
    code = overture_code(overture_id)
    search_text = " ".join(
        item
        for item in [
            code,
            overture_id,
            name,
            address_line,
            street,
            ward.ward,
            ward.district,
            "Da Nang",
            "building",
            "ACTIVE",
            "overture",
        ]
        if item
    )

    return BuildingStageRow(
        code=code,
        overture_id=overture_id,
        name=name,
        address_line=address_line,
        street=street,
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
        bbox={"xmin": xmin, "ymin": ymin, "xmax": xmax, "ymax": ymax},
        geometry=json_safe(geometry_payload),
        attributes=json_safe(properties),
        search_text=search_text,
        search_text_normalized=normalize_search_text(search_text),
    )


def row_matches_filters(
    row: BuildingStageRow,
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


def prepare_database(connection: Any, resume: bool) -> None:
    with connection.cursor() as cursor:
        cursor.execute(CREATE_STAGE_SQL)
        cursor.execute(CREATE_STATE_SQL)

        if not resume:
            cursor.execute("TRUNCATE building_property_import_stage RESTART IDENTITY")
            cursor.execute(
                """
                INSERT INTO building_property_import_state (key, last_stage_id)
                VALUES (%s, 0)
                ON CONFLICT (key) DO UPDATE SET
                  last_stage_id = 0,
                  updated_at = CURRENT_TIMESTAMP
                """,
                (IMPORT_STATE_KEY,),
            )

    connection.commit()


def parse_storage_size_to_bytes(value: str | None) -> int | None:
    if not value:
        return None

    match = re.match(r"^\s*(\d+(?:\.\d+)?)\s*([KMGT]?B)?\s*$", value, re.IGNORECASE)
    if not match:
        return None

    amount = float(match.group(1))
    unit = (match.group(2) or "B").upper()
    multipliers = {
        "B": 1,
        "KB": 1024,
        "MB": 1024**2,
        "GB": 1024**3,
        "TB": 1024**4,
    }

    return int(amount * multipliers[unit])


def fetch_storage_snapshot(connection: Any) -> StorageSnapshot:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
              current_setting('neon.max_cluster_size', true),
              pg_database_size(current_database())::BIGINT,
              CASE
                WHEN to_regclass('"BuildingProperty"') IS NULL THEN 0
                ELSE pg_total_relation_size('"BuildingProperty"'::regclass)
              END::BIGINT,
              CASE
                WHEN to_regclass('building_property_import_stage') IS NULL THEN 0
                ELSE pg_total_relation_size('building_property_import_stage'::regclass)
              END::BIGINT
            """
        )
        max_size, db_bytes, property_bytes, stage_bytes = cursor.fetchone()

        cursor.execute(
            """
            SELECT
              COUNT(*)::INTEGER,
              COUNT(*) FILTER (WHERE source = 'overture')::INTEGER
            FROM "BuildingProperty"
            """
        )
        property_row_count, overture_count = cursor.fetchone()

    return StorageSnapshot(
        max_bytes=parse_storage_size_to_bytes(max_size),
        db_bytes=int(db_bytes),
        property_bytes=int(property_bytes),
        stage_bytes=int(stage_bytes),
        property_row_count=int(property_row_count),
        overture_count=int(overture_count),
    )


def storage_capacity_error(snapshot: StorageSnapshot, target_importable_count: int | None = None) -> str | None:
    if snapshot.max_bytes is None:
        return None

    if snapshot.stage_bytes > snapshot.max_bytes * 0.70:
        return (
            "Current staging table is too large for this database project. "
            f"staging table={snapshot.stage_bytes} bytes, limit={snapshot.max_bytes} bytes. "
            "Drop/truncate staging and import a smaller district or ward subset."
        )

    if target_importable_count and snapshot.property_row_count > 0 and snapshot.overture_count > 0:
        average_property_bytes = snapshot.property_bytes / snapshot.property_row_count
        projected_property_bytes = int(average_property_bytes * target_importable_count)
        if projected_property_bytes > snapshot.max_bytes * 0.85:
            return (
                "The projected BuildingProperty size is too large for this database project. "
                f"projected BuildingProperty size={projected_property_bytes} bytes, "
                f"limit={snapshot.max_bytes} bytes, target rows={target_importable_count}. "
                "Use --district/--ward to import a smaller subset or move to a larger Neon plan."
            )

    return None


def assert_storage_capacity(connection: Any, target_importable_count: int | None = None) -> None:
    snapshot = fetch_storage_snapshot(connection)
    message = storage_capacity_error(snapshot, target_importable_count)
    if message:
        raise RuntimeError(message)


def acquire_advisory_lock(connection: Any) -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_try_advisory_lock(%s)", (IMPORT_LOCK_ID,))
        locked = cursor.fetchone()[0]

    if not locked:
        raise RuntimeError("Another Da Nang Overture building import is already running")


def release_advisory_lock(connection: Any) -> None:
    try:
        connection.rollback()
    except Exception:
        pass

    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_unlock(%s)", (IMPORT_LOCK_ID,))
    connection.commit()


def stage_rows(connection: Any, rows: list[BuildingStageRow]) -> None:
    if not rows:
        return

    params = [
        tuple(json.dumps(value, ensure_ascii=False) if index in {18, 19, 20} else value for index, value in enumerate(astuple(row)))
        for row in rows
    ]

    with connection.cursor() as cursor:
        cursor.executemany(INSERT_STAGE_SQL, params)

    connection.commit()


def stage_features(
    connection: Any,
    features: Iterable[dict[str, Any]],
    wards: list[WardBoundary],
    source_version: str,
    batch_size: int,
    districts: set[str] | None = None,
    ward_filters: set[str] | None = None,
) -> tuple[int, int, int]:
    staged = 0
    outside_scope = 0
    skipped_invalid = 0
    batch: list[BuildingStageRow] = []

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
            stage_rows(connection, batch)
            staged += len(batch)
            print(json.dumps({"stage": "staged", "rows": staged, "outsideScope": outside_scope}), flush=True)
            batch.clear()

    if batch:
        stage_rows(connection, batch)
        staged += len(batch)
        print(json.dumps({"stage": "staged", "rows": staged, "outsideScope": outside_scope}), flush=True)

    return staged, outside_scope, skipped_invalid


def last_stage_id(connection: Any) -> int:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT last_stage_id
            FROM building_property_import_state
            WHERE key = %s
            """,
            (IMPORT_STATE_KEY,),
        )
        row = cursor.fetchone()

    return 0 if row is None else int(row[0])


def set_last_stage_id(connection: Any, value: int) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO building_property_import_state (key, last_stage_id)
            VALUES (%s, %s)
            ON CONFLICT (key) DO UPDATE SET
              last_stage_id = EXCLUDED.last_stage_id,
              updated_at = CURRENT_TIMESTAMP
            """,
            (IMPORT_STATE_KEY, value),
        )


def upsert_staged_rows(connection: Any, batch_size: int) -> tuple[int, int]:
    created = 0
    updated = 0
    current_stage_id = last_stage_id(connection)

    while True:
        with connection.cursor() as cursor:
            cursor.execute(UPSERT_SQL, (current_stage_id, batch_size, current_stage_id))
            max_stage_id, rows_seen, upserted_count, existing_count = cursor.fetchone()

        if rows_seen == 0:
            connection.commit()
            break

        batch_updated = int(existing_count)
        batch_created = int(upserted_count) - batch_updated
        current_stage_id = int(max_stage_id)
        set_last_stage_id(connection, current_stage_id)
        connection.commit()
        created += batch_created
        updated += batch_updated
        print(
            json.dumps(
                {
                    "stage": "upserted",
                    "lastStageId": current_stage_id,
                    "created": created,
                    "updated": updated,
                }
            ),
            flush=True,
        )

    return created, updated


def verify_import(connection: Any, expected_importable_count: int | None = None) -> dict[str, int]:
    with connection.cursor() as cursor:
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
            ) duplicates
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


def connect_database() -> Any:
    load_dotenv(ROOT / ".env")
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    psycopg = import_psycopg()
    return psycopg.connect(database_url)


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
    acquire_advisory_lock(connection)

    try:
        prepare_database(connection, args.resume)
        assert_storage_capacity(connection, args.expected_importable_count)

        staged = 0
        outside_scope = 0
        skipped_invalid = 0
        if not args.resume:
            staged, outside_scope, skipped_invalid = stage_features(
                connection,
                features,
                wards,
                source_version,
                args.batch_size,
                district_filters,
                ward_filters,
            )

        created, updated = upsert_staged_rows(connection, args.batch_size)
        verification = verify_import(connection, staged if staged > 0 else None)
        result = ImportResult(
            staged=staged,
            created=created,
            updated=updated,
            imported=created + updated,
            outside_scope=outside_scope,
            skipped_invalid=skipped_invalid,
            source_version=source_version,
        )
        print(json.dumps({**result.__dict__, "verification": verification}, ensure_ascii=False))
        return 0
    finally:
        release_advisory_lock(connection)
        connection.close()


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gpkg", type=Path, default=DEFAULT_GPKG)
    parser.add_argument("--wards", type=Path, default=DEFAULT_WARDS)
    parser.add_argument("--source-version", default=os.getenv("GEOAI_OVERTURE_SOURCE_VERSION"))
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--resume", action="store_true")
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
        help="Optional storage preflight target from a prior --dry-run.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    return run_import(parse_args(argv or sys.argv[1:]))


if __name__ == "__main__":
    raise SystemExit(main())
