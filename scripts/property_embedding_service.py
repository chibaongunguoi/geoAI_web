import os
from typing import List

from flask import Flask, jsonify, request

DEFAULT_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_DIMENSIONS = 384

app = Flask(__name__)
_model = None
_model_name = None


def load_model(model_name: str):
    global _model, _model_name

    if _model is not None and _model_name == model_name:
        return _model

    from sentence_transformers import SentenceTransformer

    _model = SentenceTransformer(model_name)
    _model_name = model_name
    return _model


def encode_texts(texts: List[str], model_name: str):
    model = load_model(model_name)
    embeddings = model.encode(texts, normalize_embeddings=True)
    vectors = embeddings.tolist()

    for vector in vectors:
        if len(vector) != EMBEDDING_DIMENSIONS:
            raise ValueError(f"Expected {EMBEDDING_DIMENSIONS} dimensions, got {len(vector)}")

    return vectors


@app.post("/embed")
def embed():
    payload = request.get_json(silent=True) or {}
    texts = payload.get("texts")
    model_name = payload.get("model") or os.getenv("EMBEDDING_MODEL") or DEFAULT_MODEL

    if not isinstance(texts, list) or not all(isinstance(text, str) for text in texts):
        return jsonify({"error": "texts must be an array of strings"}), 400

    if len(texts) == 0:
        return jsonify({"embeddings": [], "model": model_name})

    try:
        return jsonify({"embeddings": encode_texts(texts, model_name), "model": model_name})
    except Exception as error:
        return jsonify({"error": str(error)}), 500


if __name__ == "__main__":
    port = int(os.getenv("EMBEDDING_SERVICE_PORT", "5055"))
    app.run(host="0.0.0.0", port=port)
