import argparse
import json
import os
from typing import Iterable, List, Sequence

import requests
from dotenv import load_dotenv

DEFAULT_INDEX_NAME = "building_properties_v1"
DEFAULT_EMBEDDING_SERVICE_URL = "http://localhost:5055"
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
DEFAULT_BATCH_SIZE = 128
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
                "index": True,
                "similarity": "cosine",
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
  "updatedAt",
  "deletedAt"
FROM "BuildingProperty"
WHERE "deletedAt" IS NULL
ORDER BY "updatedAt" DESC, id ASC
"""


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
    return value


def bulk_index_rows(client, index_name: str, rows: Sequence[dict], embeddings: Sequence[Sequence[float]]):
    operations = []

    for row, embedding in zip(rows, embeddings):
        action = index_action(index_name, row, embedding)
        operations.append({"index": {"_index": action["_index"], "_id": action["_id"]}})
        operations.append(json.loads(json.dumps(action["_source"], default=str)))

    if operations:
        client.bulk(operations=operations)


def ensure_index(client, index_name: str):
    if client.indices.exists(index=index_name):
        return
    client.indices.create(index=index_name, **INDEX_MAPPING)


def embed_texts(texts: Sequence[str], service_url: str, model: str) -> List[List[float]]:
    response = requests.post(
        f"{service_url.rstrip('/')}/embed",
        json={"texts": list(texts), "model": model},
        timeout=120,
    )
    response.raise_for_status()
    embeddings = response.json().get("embeddings")

    if not isinstance(embeddings, list):
        raise ValueError("Embedding service response must contain embeddings")

    for embedding in embeddings:
        if not isinstance(embedding, list) or len(embedding) != EMBEDDING_DIMENSIONS:
            raise ValueError("Embedding service returned an invalid MiniLM vector")

    return embeddings


def read_rows(database_url: str) -> List[dict]:
    import psycopg
    from psycopg.rows import dict_row

    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(SELECT_SQL)
            return list(cursor.fetchall())


def elasticsearch_client():
    from elasticsearch import Elasticsearch

    url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    username = os.getenv("ELASTICSEARCH_USERNAME")
    password = os.getenv("ELASTICSEARCH_PASSWORD")

    if username and password:
        return Elasticsearch(url, basic_auth=(username, password))

    return Elasticsearch(url)


def run(args):
    rows = active_rows(read_rows(args.database_url))
    client = elasticsearch_client()
    ensure_index(client, args.index_name)

    indexed = 0
    for batch in chunks(rows, args.batch_size):
        texts = [embedding_text(row) for row in batch]
        embeddings = embed_texts(texts, args.embedding_service_url, args.embedding_model)
        bulk_index_rows(client, args.index_name, batch, embeddings)
        indexed += len(batch)
        print(f"Indexed {indexed}/{len(rows)} BuildingProperty rows")

    return indexed


def parse_args():
    load_dotenv()
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
    args = parser.parse_args()

    if not args.database_url:
        parser.error("DATABASE_URL or --database-url is required")

    return args


if __name__ == "__main__":
    run(parse_args())
