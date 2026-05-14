import argparse
import json
import os
import sqlite3
import time
import unicodedata
from pathlib import Path
from typing import Iterable, Sequence

import requests
from dotenv import load_dotenv

DEFAULT_BATCH_SIZE = 2000
DEFAULT_EMBEDDING_SERVICE_URL = "http://localhost:5055"
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_DIMENSIONS = 384

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
  source
FROM "BuildingProperty"
WHERE "deletedAt" IS NULL
  AND embedding IS NULL
ORDER BY "updatedAt" DESC, id ASC
LIMIT ?
"""

UPDATE_SQL = """
UPDATE "BuildingProperty"
SET
  embedding = ?,
  "searchText" = ?,
  "searchTextNormalized" = ?
WHERE id = ?
"""


def clean(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def searchable_text(row: dict) -> str:
    fields = [
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
    ]
    return " ".join(str(row[field]).strip() for field in fields if clean(row.get(field)))


def normalize_search_text(value: str) -> str:
    value = add_case_spaces(value).replace("đ", "d").replace("Đ", "D")
    value = unicodedata.normalize("NFD", value)
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    chars = [char.lower() if char.isalnum() and char.isascii() else " " for char in value]
    return " ".join("".join(chars).split())


def add_case_spaces(value: str) -> str:
    chars = []
    previous = ""
    for char in value:
        if previous and previous.islower() and char.isupper():
            chars.append(" ")
        chars.append(char)
        previous = char
    return "".join(chars)


def database_path(database_url: str | None) -> Path:
    root = Path(__file__).resolve().parents[1]
    if database_url and database_url.startswith("file:"):
        raw_path = database_url.removeprefix("file:")
        path = Path(raw_path)
        if path.is_absolute():
            return path
        return (root / "apps" / "api" / "prisma" / path).resolve()
    return root / "geoai_data" / "geoai.db"


def dict_factory(cursor, row):
    return {column[0]: row[index] for index, column in enumerate(cursor.description)}


def embed_texts(texts: Sequence[str], service_url: str, model: str) -> list[list[float]]:
    response = requests.post(
        f"{service_url.rstrip('/')}/embed",
        json={"texts": list(texts), "model": model},
        timeout=600,
    )
    response.raise_for_status()
    embeddings = response.json().get("embeddings")
    if not isinstance(embeddings, list):
        raise ValueError("Embedding service response must contain embeddings")
    for embedding in embeddings:
        if not isinstance(embedding, list) or len(embedding) != EMBEDDING_DIMENSIONS:
            raise ValueError("Embedding service returned an invalid MiniLM vector")
    return embeddings


def update_batch(connection: sqlite3.Connection, rows: Sequence[dict], embeddings: Sequence[Sequence[float]]) -> int:
    payloads = []
    for row, embedding in zip(rows, embeddings):
        text = searchable_text(row)
        payloads.append(
            (
                json.dumps([float(value) for value in embedding], separators=(",", ":")),
                text,
                normalize_search_text(text),
                row["id"],
            )
        )

    connection.execute("BEGIN IMMEDIATE")
    try:
        connection.executemany(UPDATE_SQL, payloads)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    return len(payloads)


def missing_count(connection: sqlite3.Connection) -> int:
    row = connection.execute(
        'SELECT count(*) AS count FROM "BuildingProperty" WHERE "deletedAt" IS NULL AND embedding IS NULL'
    ).fetchone()
    return int(row["count"])


def run(args) -> int:
    path = database_path(args.database_url)
    if not path.exists():
        raise FileNotFoundError(f"SQLite database not found: {path}")

    connection = sqlite3.connect(path)
    connection.row_factory = dict_factory
    connection.isolation_level = None

    total_missing = missing_count(connection)
    processed = 0
    batch_number = 0
    started = time.time()
    print(f"Embedding SQL backfill started: {total_missing} rows missing, batch_size={args.batch_size}", flush=True)

    try:
        while True:
            rows = connection.execute(SELECT_SQL, (args.batch_size,)).fetchall()
            if not rows:
                break

            batch_number += 1
            texts = [searchable_text(row) for row in rows]
            embeddings = embed_texts(texts, args.embedding_service_url, args.embedding_model)
            updated = update_batch(connection, rows, embeddings)
            processed += updated
            remaining = missing_count(connection)
            elapsed = time.time() - started
            print(
                f"Committed batch {batch_number}: updated={updated}, processed={processed}, remaining={remaining}, elapsed={elapsed:.1f}s",
                flush=True,
            )

        print(f"Embedding SQL backfill complete: processed={processed}, elapsed={time.time() - started:.1f}s", flush=True)
        return processed
    finally:
        connection.close()


def parse_args():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Backfill BuildingProperty.embedding with SQL commits per batch.")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--embedding-service-url", default=os.getenv("EMBEDDING_SERVICE_URL", DEFAULT_EMBEDDING_SERVICE_URL))
    parser.add_argument("--embedding-model", default=os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL))
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
