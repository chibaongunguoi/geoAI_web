import argparse
import json
import os
from pathlib import Path
from typing import Iterable, List, Sequence

import requests
from dotenv import load_dotenv

DEFAULT_INDEX_NAME = "building_properties_v1"
DEFAULT_EMBEDDING_SERVICE_URL = "http://localhost:5055"
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
DEFAULT_BATCH_SIZE = 512
DEFAULT_EMBEDDING_TIMEOUT_SECONDS = 180
DEFAULT_BULK_TIMEOUT_SECONDS = 300
EMBEDDING_DIMENSIONS = 384

INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "code": {"type": "keyword"},
            "overtureId": {"type": "keyword"},
            "name": {"type": "text"},
            "addressLine": {"type": "text"},
            "street": {"type": "text"},
            "ward": {"type": "keyword", "fields": {"text": {"type": "text"}}},
            "district": {"type": "keyword", "fields": {"text": {"type": "text"}}},
            "city": {"type": "keyword", "fields": {"text": {"type": "text"}}},
            "propertyType": {"type": "keyword"},
            "status": {"type": "keyword"},
            "source": {"type": "keyword"},
            "centroidLat": {"type": "double"},
            "centroidLng": {"type": "double"},
            "bbox": {"type": "object", "enabled": False},
            "searchText": {"type": "text"},
            "searchTextNormalized": {"type": "text"},
            "embedding": {
                "type": "dense_vector",
                "dims": EMBEDDING_DIMENSIONS,
                "index": False,
            },
            "deleted": {"type": "boolean"},
            "updatedAt": {"type": "date"},
            "deletedAt": {"type": "date"},
        }
    }
}

SELECT_SQL = """
SELECT
  id,
  code,
  "overtureId",
  name,
  "addressLine",
  street,
  ward,
  district,
  city,
  "propertyType",
  status,
  source,
  "centroidLat",
  "centroidLng",
  bbox,
  "searchText",
  "searchTextNormalized",
  embedding,
  "updatedAt",
  "deletedAt"
FROM "BuildingProperty"
WHERE "deletedAt" IS NULL
ORDER BY "updatedAt" DESC, id ASC
"""

COUNT_SQL = """
SELECT count(*) AS count
FROM "BuildingProperty"
WHERE "deletedAt" IS NULL
"""


def normalize_search_text(value: str):
    import re
    import unicodedata

    text = unicodedata.normalize("NFD", value or "")
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "D").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def apply_district_filter(sql: str, district: str | None):
    if not district:
        return sql, ()

    filtered = sql.replace(
        'WHERE "deletedAt" IS NULL',
        '''
WHERE "deletedAt" IS NULL
  AND (
    "district" = ? COLLATE NOCASE
    OR "searchTextNormalized" LIKE ?
  )
'''.rstrip()
    )
    return filtered, (district, f"%{normalize_search_text(district)}%")


def chunks(items: Sequence[dict], size: int):
    for index in range(0, len(items), size):
        yield items[index : index + size]


def clean(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def embedding_text(row: dict) -> str:
    fields = [
        "code",
        "name",
        "addressLine",
        "street",
        "ward",
        "district",
        "city",
        "propertyType",
        "status",
    ]
    return " ".join(str(row.get(field)).strip() for field in fields if clean(row.get(field)))


def active_rows(rows: Iterable[dict]) -> List[dict]:
    return [row for row in rows if not row.get("deletedAt")]


def index_action(index_name: str, row: dict, embedding: Sequence[float]) -> dict:
    return {
        "_index": index_name,
        "_id": row["id"],
        "_source": {
            "id": row.get("id"),
            "code": row.get("code"),
            "overtureId": row.get("overtureId"),
            "name": row.get("name"),
            "addressLine": row.get("addressLine"),
            "street": row.get("street"),
            "ward": row.get("ward"),
            "district": row.get("district"),
            "city": row.get("city"),
            "propertyType": row.get("propertyType"),
            "status": row.get("status"),
            "source": row.get("source"),
            "centroidLat": row.get("centroidLat"),
            "centroidLng": row.get("centroidLng"),
            "bbox": row.get("bbox"),
            "searchText": row.get("searchText") or embedding_text(row),
            "searchTextNormalized": row.get("searchTextNormalized"),
            "embedding": [float(value) for value in embedding],
            "deleted": bool(row.get("deletedAt")),
            "updatedAt": iso_value(row.get("updatedAt")),
            "deletedAt": iso_value(row.get("deletedAt")),
        },
    }


def iso_value(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, str) and " " in value and "T" not in value:
        return f"{value.replace(' ', 'T')}.000Z"
    return value


def bulk_index_rows(client, index_name: str, rows: Sequence[dict], embeddings: Sequence[Sequence[float]]):
    operations = []

    for row, embedding in zip(rows, embeddings):
        action = index_action(index_name, row, embedding)
        operations.append({"index": {"_index": action["_index"], "_id": action["_id"]}})
        operations.append(json.loads(json.dumps(action["_source"], default=str)))

    if operations:
        response = client.bulk(operations=operations)
        if hasattr(response, "get") and response.get("errors") is True:
            first_error = next(
                (item for item in response.get("items", []) if item.get("index", {}).get("error")),
                None,
            )
            raise RuntimeError(f"Elasticsearch bulk index failed: {first_error}")


def bulk_index_rows_ndjson(
    session: requests.Session,
    index_name: str,
    rows: Sequence[dict],
    embeddings: Sequence[Sequence[float] | str],
    timeout_seconds: int,
):
    url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200").rstrip("/")
    username = os.getenv("ELASTICSEARCH_USERNAME")
    password = os.getenv("ELASTICSEARCH_PASSWORD")
    auth = (username, password) if username and password else None
    lines = []

    for row, embedding in zip(rows, embeddings):
        lines.append(json.dumps({"index": {"_index": index_name, "_id": row["id"]}}, separators=(",", ":")))
        source = {
            "id": row.get("id"),
            "code": row.get("code"),
            "overtureId": row.get("overtureId"),
            "name": row.get("name"),
            "addressLine": row.get("addressLine"),
            "street": row.get("street"),
            "ward": row.get("ward"),
            "district": row.get("district"),
            "city": row.get("city"),
            "propertyType": row.get("propertyType"),
            "status": row.get("status"),
            "source": row.get("source"),
            "centroidLat": row.get("centroidLat"),
            "centroidLng": row.get("centroidLng"),
            "bbox": row.get("bbox"),
            "searchText": row.get("searchText") or embedding_text(row),
            "searchTextNormalized": row.get("searchTextNormalized"),
            "deleted": bool(row.get("deletedAt")),
            "updatedAt": iso_value(row.get("updatedAt")),
            "deletedAt": iso_value(row.get("deletedAt")),
        }
        source_json = json.dumps(source, ensure_ascii=False, default=str, separators=(",", ":"))
        embedding_json = (
            embedding
            if isinstance(embedding, str)
            else json.dumps([float(value) for value in embedding], separators=(",", ":"))
        )
        lines.append(f"{source_json[:-1]},\"embedding\":{embedding_json}}}")

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
        first_error = next(
            (item for item in payload.get("items", []) if item.get("index", {}).get("error")),
            None,
        )
        raise RuntimeError(f"Elasticsearch bulk index failed: {first_error}")


def stored_embedding(row: dict):
    value = row.get("embedding")
    if value is None:
        return None

    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return None

    if not isinstance(value, list) or len(value) != EMBEDDING_DIMENSIONS:
        return None

    return [float(item) for item in value]


def stored_embedding_json(row: dict):
    value = row.get("embedding")
    if isinstance(value, str) and value.startswith("[") and value.endswith("]"):
        return value
    return None


def ensure_index(client, index_name: str):
    if client.indices.exists(index=index_name):
        return
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
) -> List[List[float]]:
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


def database_path(database_url: str):
    import sqlite3
    from pathlib import Path

    if database_url.startswith("file:"):
        raw_path = database_url.removeprefix("file:")
        path = Path(raw_path)
        if path.is_absolute():
            return str(path)
        return str((Path(__file__).resolve().parents[1] / "apps" / "api" / "prisma" / path).resolve())
    return str(Path(__file__).resolve().parents[1] / "geoai_data" / "geoai.db")


def read_rows(database_url: str) -> List[dict]:
    import sqlite3

    db_path = database_path(database_url)
    def dict_factory(cursor, row):
        d = {}
        for idx, col in enumerate(cursor.description):
            d[col[0]] = row[idx]
        return d

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = dict_factory
        return list(connection.execute(SELECT_SQL))


def read_row_batches(
    database_url: str,
    batch_size: int,
    start_offset: int = 0,
    district: str | None = None
):
    import sqlite3

    db_path = database_path(database_url)

    def dict_factory(cursor, row):
        d = {}
        for idx, col in enumerate(cursor.description):
            d[col[0]] = row[idx]
        return d

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = dict_factory
        count_sql, filter_params = apply_district_filter(COUNT_SQL, district)
        select_sql, _ = apply_district_filter(SELECT_SQL, district)
        total = int(connection.execute(count_sql, filter_params).fetchone()["count"])
        offset = max(0, start_offset)

        while offset < total:
            rows = list(
                connection.execute(
                    f"{select_sql} LIMIT ? OFFSET ?",
                    (*filter_params, batch_size, offset)
                )
            )
            if not rows:
                break
            yield total, rows
            offset += len(rows)


def elasticsearch_client():
    from elasticsearch import Elasticsearch

    url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    username = os.getenv("ELASTICSEARCH_USERNAME")
    password = os.getenv("ELASTICSEARCH_PASSWORD")

    if username and password:
        return Elasticsearch(url, basic_auth=(username, password))

    return Elasticsearch(url)


def run(args):
    client = elasticsearch_client()
    if args.recreate_index:
        recreate_index(client, args.index_name)
    else:
        ensure_index(client, args.index_name)

    indexed = 0
    total = 0
    with requests.Session() as session:
        for total, batch in read_row_batches(
            args.database_url,
            args.batch_size,
            args.offset,
            args.district
        ):
            texts = [embedding_text(row) for row in batch]
            embeddings = []
            missing_indexes = []

            for index, row in enumerate(batch):
                embedding = stored_embedding_json(row) or stored_embedding(row)
                if embedding is None:
                    embeddings.append(None)
                    missing_indexes.append(index)
                else:
                    embeddings.append(embedding)

            if missing_indexes:
                missing_embeddings = embed_texts(
                    session,
                    [texts[index] for index in missing_indexes],
                    args.embedding_service_url,
                    args.embedding_model,
                    args.embedding_timeout,
                )
                for index, embedding in zip(missing_indexes, missing_embeddings):
                    embeddings[index] = embedding

            bulk_index_rows_ndjson(session, args.index_name, batch, embeddings, args.bulk_timeout)
            indexed += len(batch)
            print(f"Indexed {indexed}/{total} BuildingProperty rows", flush=True)

    return indexed


def parse_args():
    repo_root = Path(__file__).resolve().parents[1]
    load_dotenv(repo_root / "apps" / "api" / ".env")
    load_dotenv(repo_root / ".env", override=False)
    parser = argparse.ArgumentParser(description="Index BuildingProperty rows into Elasticsearch.")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument("--index-name", default=os.getenv("PROPERTY_INDEX_NAME", DEFAULT_INDEX_NAME))
    parser.add_argument(
        "--embedding-service-url",
        default=os.getenv("EMBEDDING_SERVICE_URL", DEFAULT_EMBEDDING_SERVICE_URL),
    )
    parser.add_argument("--embedding-model", default=os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL))
    parser.add_argument(
        "--batch-size",
        type=int,
        default=int(os.getenv("EMBEDDING_BATCH_SIZE", str(DEFAULT_BATCH_SIZE))),
    )
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
    parser.add_argument(
        "--offset",
        type=int,
        default=int(os.getenv("PROPERTY_INDEX_OFFSET", "0")),
        help="Skip this many rows in the stable SQLite ordering before indexing.",
    )
    parser.add_argument(
        "--recreate-index",
        action="store_true",
        help="Delete and recreate the Elasticsearch index before indexing all rows.",
    )
    parser.add_argument(
        "--district",
        default=os.getenv("PROPERTY_INDEX_DISTRICT"),
        help='Only index rows matching this district, for example "Hai Chau" or "Lien Chieu".',
    )
    args = parser.parse_args()

    if not args.database_url:
        parser.error("DATABASE_URL or --database-url is required")

    return args


if __name__ == "__main__":
    run(parse_args())
