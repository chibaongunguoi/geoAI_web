import argparse
import json
import os
import re
import sqlite3
import unicodedata
from pathlib import Path
from typing import Iterable, Sequence

import requests
from dotenv import load_dotenv

DEFAULT_INDEX_NAME = "places_v1"
DEFAULT_EMBEDDING_SERVICE_URL = "http://localhost:5055"
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
DEFAULT_BATCH_SIZE = 512
DEFAULT_EMBEDDING_TIMEOUT_SECONDS = 180
DEFAULT_BULK_TIMEOUT_SECONDS = 300
EMBEDDING_DIMENSIONS = 384

CATEGORY_LABELS = {
    "restaurant": "Nh\u00e0 h\u00e0ng",
    "vietnamese_restaurant": "Nh\u00e0 h\u00e0ng Vi\u1ec7t Nam",
    "seafood_restaurant": "Nh\u00e0 h\u00e0ng h\u1ea3i s\u1ea3n",
    "fast_food_restaurant": "Nh\u00e0 h\u00e0ng th\u1ee9c \u0103n nhanh",
    "vegetarian_restaurant": "Nh\u00e0 h\u00e0ng chay",
    "diner": "Qu\u00e1n \u0103n",
    "cafe": "Qu\u00e1n c\u00e0 ph\u00ea",
    "coffee_shop": "Qu\u00e1n c\u00e0 ph\u00ea",
    "hotel": "Kh\u00e1ch s\u1ea1n",
    "resort": "Khu ngh\u1ec9 d\u01b0\u1ee1ng",
    "lodge": "Nh\u00e0 ngh\u1ec9",
    "accommodation": "L\u01b0u tr\u00fa",
    "hospital": "B\u1ec7nh vi\u1ec7n",
    "clinic": "Ph\u00f2ng kh\u00e1m",
    "pharmacy": "Nh\u00e0 thu\u1ed1c",
    "school": "Tr\u01b0\u1eddng h\u1ecdc",
    "elementary_school": "Tr\u01b0\u1eddng ti\u1ec3u h\u1ecdc",
    "supermarket": "Si\u00eau th\u1ecb",
    "market": "Ch\u1ee3",
    "convenience_store": "C\u1eeda h\u00e0ng ti\u1ec7n l\u1ee3i",
}

INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "overtureId": {"type": "keyword"},
            "name": {"type": "text"},
            "category": {"type": "keyword"},
            "vietnameseCategory": {"type": "text"},
            "subcategories": {"type": "keyword"},
            "address": {"type": "text"},
            "street": {"type": "text"},
            "ward": {"type": "keyword", "fields": {"text": {"type": "text"}}},
            "district": {"type": "keyword", "fields": {"text": {"type": "text"}}},
            "city": {"type": "keyword", "fields": {"text": {"type": "text"}}},
            "location": {"type": "geo_point"},
            "latitude": {"type": "double"},
            "longitude": {"type": "double"},
            "confidence": {"type": "double"},
            "source": {"type": "keyword"},
            "sourceVersion": {"type": "keyword"},
            "searchText": {"type": "text"},
            "searchTextNormalized": {"type": "text"},
            "embedding": {
                "type": "dense_vector",
                "dims": EMBEDDING_DIMENSIONS,
                "index": False,
            },
            "createdAt": {"type": "date"},
            "updatedAt": {"type": "date"},
        }
    }
}

SELECT_SQL = """
SELECT
  id,
  "overtureId",
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
  confidence,
  source,
  "sourceVersion",
  "createdAt",
  "updatedAt"
FROM "Place"
ORDER BY "updatedAt" DESC, id ASC
"""


def normalize_text(value: str | None) -> str:
    text = unicodedata.normalize("NFD", value or "")
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("\u0111", "d").replace("\u0110", "D").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def database_path(database_url: str | None) -> str:
    if database_url and database_url.startswith("file:"):
        raw_path = database_url.removeprefix("file:")
        path = Path(raw_path)
        if path.is_absolute():
            return str(path)
        return str((Path(__file__).resolve().parents[1] / "apps" / "api" / "prisma" / path).resolve())
    return str(Path(__file__).resolve().parents[1] / "geoai_data" / "geoai.db")


def decode_json_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if item]
    if isinstance(value, str) and value:
        try:
            decoded = json.loads(value)
            if isinstance(decoded, list):
                return [str(item) for item in decoded if item]
        except json.JSONDecodeError:
            return []
    return []


def clean(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def category_label(category: str | None) -> str:
    return CATEGORY_LABELS.get(category or "", category or "POI")


def embedding_text(row: dict) -> str:
    subcategories = decode_json_list(row.get("subcategories"))
    fields = [
        row.get("name"),
        row.get("category"),
        category_label(row.get("category")),
        *subcategories,
        row.get("address"),
        row.get("street"),
        row.get("ward"),
        row.get("district"),
        row.get("city"),
    ]
    return " ".join(str(value).strip() for value in fields if clean(value))


def source_for_row(row: dict, embedding: Sequence[float]) -> dict:
    subcategories = decode_json_list(row.get("subcategories"))
    search_text = embedding_text(row)
    return {
        "id": row.get("id"),
        "overtureId": row.get("overtureId"),
        "name": row.get("name"),
        "category": row.get("category"),
        "vietnameseCategory": category_label(row.get("category")),
        "subcategories": subcategories,
        "address": row.get("address"),
        "street": row.get("street"),
        "ward": row.get("ward"),
        "district": row.get("district"),
        "city": row.get("city"),
        "location": {"lat": row.get("latitude"), "lon": row.get("longitude")},
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "confidence": row.get("confidence"),
        "source": row.get("source"),
        "sourceVersion": row.get("sourceVersion"),
        "searchText": search_text,
        "searchTextNormalized": normalize_text(search_text),
        "embedding": [float(value) for value in embedding],
        "createdAt": iso_value(row.get("createdAt")),
        "updatedAt": iso_value(row.get("updatedAt")),
    }


def iso_value(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, str) and " " in value and "T" not in value:
        return f"{value.replace(' ', 'T')}.000Z"
    return value


def elasticsearch_client():
    from elasticsearch import Elasticsearch

    url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    username = os.getenv("ELASTICSEARCH_USERNAME")
    password = os.getenv("ELASTICSEARCH_PASSWORD")
    if username and password:
        return Elasticsearch(url, basic_auth=(username, password))
    return Elasticsearch(url)


def ensure_index(client, index_name: str):
    if not client.indices.exists(index=index_name):
        client.indices.create(index=index_name, **INDEX_MAPPING)


def recreate_index(client, index_name: str):
    if client.indices.exists(index=index_name):
        client.indices.delete(index=index_name)
    client.indices.create(index=index_name, **INDEX_MAPPING)


def embed_texts(
    session: requests.Session,
    texts: Sequence[str],
    service_url: str,
    model: str,
    timeout_seconds: int,
) -> list[list[float]]:
    response = session.post(
        f"{service_url.rstrip('/')}/embed",
        json={"texts": list(texts), "model": model},
        timeout=timeout_seconds,
    )
    response.raise_for_status()
    embeddings = response.json().get("embeddings")
    if not isinstance(embeddings, list):
        raise ValueError("Embedding service response must contain embeddings")
    for embedding in embeddings:
        if not isinstance(embedding, list) or len(embedding) != EMBEDDING_DIMENSIONS:
            raise ValueError("Embedding service returned an invalid MiniLM vector")
    return embeddings


def bulk_index_rows(
    session: requests.Session,
    index_name: str,
    rows: Sequence[dict],
    embeddings: Sequence[Sequence[float]],
    timeout_seconds: int,
):
    url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200").rstrip("/")
    username = os.getenv("ELASTICSEARCH_USERNAME")
    password = os.getenv("ELASTICSEARCH_PASSWORD")
    auth = (username, password) if username and password else None
    lines: list[str] = []
    for row, embedding in zip(rows, embeddings):
        lines.append(json.dumps({"index": {"_index": index_name, "_id": row["id"]}}, separators=(",", ":")))
        lines.append(json.dumps(source_for_row(row, embedding), ensure_ascii=False, default=str, separators=(",", ":")))
    if not lines:
        return
    response = session.post(
        f"{url}/_bulk",
        data=("\n".join(lines) + "\n").encode("utf-8"),
        headers={"Content-Type": "application/x-ndjson"},
        auth=auth,
        timeout=timeout_seconds,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("errors"):
        first_error = next((item for item in payload.get("items", []) if item.get("index", {}).get("error")), None)
        raise RuntimeError(f"Elasticsearch bulk index failed: {first_error}")


def read_filtered_rows(database_url: str | None, district: str | None) -> list[dict]:
    db_path = database_path(database_url)
    normalized_district = normalize_text(district)

    def dict_factory(cursor, row):
        return {column[0]: row[index] for index, column in enumerate(cursor.description)}

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = dict_factory
        rows = list(connection.execute(SELECT_SQL))

    if not normalized_district:
        return rows
    return [row for row in rows if normalize_text(row.get("district")) == normalized_district]


def chunks(items: Sequence[dict], size: int):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def run(args) -> int:
    client = elasticsearch_client()
    if args.recreate_index:
        recreate_index(client, args.index_name)
    else:
        ensure_index(client, args.index_name)

    rows = read_filtered_rows(args.database_url, args.district)
    indexed = 0
    total = len(rows)
    with requests.Session() as session:
        for batch in chunks(rows, args.batch_size):
            texts = [embedding_text(row) for row in batch]
            embeddings = embed_texts(
                session,
                texts,
                args.embedding_service_url,
                args.embedding_model,
                args.embedding_timeout,
            )
            bulk_index_rows(session, args.index_name, batch, embeddings, args.bulk_timeout)
            indexed += len(batch)
            print(f"Indexed {indexed}/{total} Place rows", flush=True)
    return indexed


def parse_args():
    repo_root = Path(__file__).resolve().parents[1]
    load_dotenv(repo_root / "apps" / "api" / ".env")
    load_dotenv(repo_root / ".env", override=False)
    parser = argparse.ArgumentParser(description="Index Place POI rows into Elasticsearch.")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument("--index-name", default=os.getenv("PLACE_INDEX_NAME", DEFAULT_INDEX_NAME))
    parser.add_argument("--embedding-service-url", default=os.getenv("EMBEDDING_SERVICE_URL", DEFAULT_EMBEDDING_SERVICE_URL))
    parser.add_argument("--embedding-model", default=os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL))
    parser.add_argument("--batch-size", type=int, default=int(os.getenv("EMBEDDING_BATCH_SIZE", str(DEFAULT_BATCH_SIZE))))
    parser.add_argument(
        "--embedding-timeout",
        type=int,
        default=int(os.getenv("EMBEDDING_TIMEOUT_SECONDS", str(DEFAULT_EMBEDDING_TIMEOUT_SECONDS))),
    )
    parser.add_argument(
        "--bulk-timeout",
        type=int,
        default=int(os.getenv("ELASTICSEARCH_BULK_TIMEOUT_SECONDS", str(DEFAULT_BULK_TIMEOUT_SECONDS))),
    )
    parser.add_argument("--recreate-index", action="store_true")
    parser.add_argument("--district", default=os.getenv("PLACE_INDEX_DISTRICT"))
    args = parser.parse_args()
    if not args.database_url:
        parser.error("DATABASE_URL or --database-url is required")
    return args


if __name__ == "__main__":
    run(parse_args())
