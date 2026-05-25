"""Convert rows from Place into real BuildingProperty assets.

Examples:
  python scripts/convert_pois_to_assets.py --dry-run --district "Hải Châu"
  python scripts/convert_pois_to_assets.py --district "Hải Châu"
  python scripts/convert_pois_to_assets.py --category cafe --category coffee_shop
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "geoai_data" / "geoai.db"


@dataclass(frozen=True)
class PlaceRow:
    id: str
    overture_id: str
    name: str
    category: str
    subcategories: str
    address: str | None
    street: str | None
    ward: str | None
    district: str | None
    city: str
    latitude: float
    longitude: float
    geometry: str
    confidence: float
    source: str
    source_version: str | None


def resolve_db_path(database_url: str | None) -> Path:
    value = (database_url or "").strip().strip('"')
    if value.startswith("file:"):
        raw = value[5:]
        path = Path(raw)
        if path.is_absolute():
            return path
        return (ROOT / "apps" / "api" / "prisma" / path).resolve()
    return DEFAULT_DB


def normalize_text(value: Any) -> str:
    text = str(value or "")
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "D").lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", text)).strip()


def compact_id(value: str) -> str:
    compact = re.sub(r"[^a-zA-Z0-9]+", "", value or "").lower()
    return compact[-18:] or "unknown"


def asset_id(place: PlaceRow) -> str:
    return f"poiasset_{compact_id(place.overture_id or place.id)}"


def parse_json(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def next_poi_code_start(connection: sqlite3.Connection) -> int:
    rows = connection.execute(
        """SELECT code FROM "BuildingProperty" WHERE code LIKE 'DN-POI-%'"""
    ).fetchall()
    max_value = 0
    for (code,) in rows:
        match = re.search(r"DN-POI-(\d+)$", str(code or ""))
        if match:
            max_value = max(max_value, int(match.group(1)))
    return max_value + 1


def place_rows(
    connection: sqlite3.Connection,
    categories: list[str],
    district: str | None,
    ward: str | None,
    limit: int | None,
) -> list[PlaceRow]:
    conditions = ["overtureId IS NOT NULL", "name IS NOT NULL", "category IS NOT NULL"]
    params: list[Any] = []
    if categories:
        placeholders = ", ".join("?" for _ in categories)
        conditions.append(f"category IN ({placeholders})")
        params.extend(categories)
    if district:
        conditions.append("district = ?")
        params.append(district)
    if ward:
        conditions.append("ward = ?")
        params.append(ward)

    sql = f"""
      SELECT
        id,
        overtureId,
        name,
        category,
        subcategories,
        address,
        street,
        ward,
        district,
        city,
        latitude,
        longitude,
        geometry,
        confidence,
        source,
        sourceVersion
      FROM "Place"
      WHERE {" AND ".join(conditions)}
      ORDER BY confidence DESC, name ASC
    """
    if limit:
      sql += " LIMIT ?"
      params.append(limit)

    return [
        PlaceRow(
            id=row[0],
            overture_id=row[1],
            name=row[2],
            category=row[3],
            subcategories=row[4] or "[]",
            address=row[5],
            street=row[6],
            ward=row[7],
            district=row[8],
            city=row[9] or "Da Nang",
            latitude=float(row[10]),
            longitude=float(row[11]),
            geometry=row[12],
            confidence=float(row[13] or 0),
            source=row[14] or "overture-places",
            source_version=row[15],
        )
        for row in connection.execute(sql, params).fetchall()
    ]


def build_asset_payload(place: PlaceRow, code: str) -> dict[str, Any]:
    subcategories = parse_json(place.subcategories, [])
    geometry = parse_json(place.geometry, {"type": "Point", "coordinates": [place.longitude, place.latitude]})
    attributes = {
        "placeId": place.id,
        "category": place.category,
        "subcategories": subcategories,
        "confidence": place.confidence,
        "placeSource": place.source,
        "address": place.address,
    }
    search_text = " ".join(
        str(part)
        for part in [
            code,
            place.name,
            place.category,
            place.address,
            place.street,
            place.ward,
            place.district,
            place.city,
        ]
        if part
    )
    return {
        "id": asset_id(place),
        "code": code,
        "overtureId": place.overture_id,
        "name": place.name,
        "addressLine": place.address or place.street,
        "street": place.street,
        "ward": place.ward,
        "district": place.district,
        "city": place.city,
        "propertyType": place.category,
        "status": "ACTIVE",
        "source": "overture",
        "sourceVersion": place.source_version,
        "centroidLat": place.latitude,
        "centroidLng": place.longitude,
        "geometry": json.dumps(geometry, ensure_ascii=False),
        "attributes": json.dumps(attributes, ensure_ascii=False),
        "searchText": search_text,
        "searchTextNormalized": normalize_text(search_text),
    }


INSERT_SQL = """
INSERT INTO "BuildingProperty" (
  id, code, overtureId, name, addressLine, street, ward, district, city,
  propertyType, status, source, sourceVersion, centroidLat, centroidLng,
  geometry, attributes, searchText, searchTextNormalized, createdAt, updatedAt
) VALUES (
  :id, :code, :overtureId, :name, :addressLine, :street, :ward, :district, :city,
  :propertyType, :status, :source, :sourceVersion, :centroidLat, :centroidLng,
  :geometry, :attributes, :searchText, :searchTextNormalized, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
"""


UPDATE_SQL = """
UPDATE "BuildingProperty"
SET
  name = :name,
  addressLine = :addressLine,
  street = :street,
  ward = :ward,
  district = :district,
  city = :city,
  propertyType = :propertyType,
  status = :status,
  source = :source,
  sourceVersion = :sourceVersion,
  centroidLat = :centroidLat,
  centroidLng = :centroidLng,
  geometry = :geometry,
  attributes = :attributes,
  searchText = :searchText,
  searchTextNormalized = :searchTextNormalized,
  updatedAt = CURRENT_TIMESTAMP,
  deletedAt = NULL
WHERE overtureId = :overtureId
"""


def existing_overture_ids(connection: sqlite3.Connection, overture_ids: list[str]) -> set[str]:
    if not overture_ids:
        return set()
    existing: set[str] = set()
    for index in range(0, len(overture_ids), 900):
        batch = overture_ids[index:index + 900]
        placeholders = ", ".join("?" for _ in batch)
        rows = connection.execute(
            f'SELECT overtureId FROM "BuildingProperty" WHERE overtureId IN ({placeholders})',
            batch,
        ).fetchall()
        existing.update(row[0] for row in rows)
    return existing


def convert(connection: sqlite3.Connection, args: argparse.Namespace) -> dict[str, int]:
    rows = place_rows(connection, args.category, args.district, args.ward, args.limit)
    existing_ids = existing_overture_ids(connection, [row.overture_id for row in rows])
    next_code = next_poi_code_start(connection)
    created = 0
    updated = 0
    skipped_existing = 0

    for row in rows:
        exists = row.overture_id in existing_ids
        if exists and not args.update_existing:
            skipped_existing += 1
            continue

        code = f"DN-POI-{next_code:06d}"
        if not exists:
            next_code += 1
        payload = build_asset_payload(row, code)

        if args.dry_run:
            if exists:
                updated += 1
            else:
                created += 1
            continue

        if exists:
            connection.execute(UPDATE_SQL, payload)
            updated += 1
        else:
            connection.execute(INSERT_SQL, payload)
            created += 1

    if not args.dry_run:
        connection.commit()

    return {
        "matched_places": len(rows),
        "created": created,
        "updated": updated,
        "skipped_existing": skipped_existing,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert Place POIs into BuildingProperty assets.")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument("--category", action="append", default=[], help="Limit to one or more Place categories.")
    parser.add_argument("--district", help='Limit to a district, for example "Hải Châu".')
    parser.add_argument("--ward", help='Limit to a ward, for example "Hải Châu I".')
    parser.add_argument("--limit", type=int, help="Limit number of Place rows processed.")
    parser.add_argument("--update-existing", action="store_true", help="Update existing assets with matching overtureId.")
    parser.add_argument("--dry-run", action="store_true", help="Preview counts without writing.")
    args = parser.parse_args()

    db_path = resolve_db_path(args.database_url)
    if not db_path.exists():
        raise FileNotFoundError(f"SQLite database not found: {db_path}")

    connection = sqlite3.connect(db_path)
    try:
        result = convert(connection, args)
        print(json.dumps({"database": str(db_path), "dry_run": args.dry_run, **result}, ensure_ascii=False, indent=2))
    finally:
        connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
