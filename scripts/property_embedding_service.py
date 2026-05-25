import os
from typing import List

from flask import Flask, jsonify, request

DEFAULT_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
DEFAULT_DEVICE = "auto"
EMBEDDING_DIMENSIONS = 384

app = Flask(__name__)
_model = None
_model_name = None
_model_device = None
_gpu_name = None


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "modelLoaded": _model is not None,
        "model": _model_name,
        "device": _model_device or selected_device(),
        "gpu": _gpu_name or gpu_name()
    })


def gpu_name():
    try:
        import torch

        if torch.cuda.is_available():
            return torch.cuda.get_device_name(0)
    except Exception:
        return None

    return None


def selected_device():
    requested = (os.getenv("EMBEDDING_DEVICE") or DEFAULT_DEVICE).strip().lower()

    if requested and requested != "auto":
        return requested

    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        return "cpu"

    return "cpu"


def load_model(model_name: str):
    global _model, _model_name, _model_device, _gpu_name

    device = selected_device()

    if _model is not None and _model_name == model_name and _model_device == device:
        return _model

    from sentence_transformers import SentenceTransformer

    _model = SentenceTransformer(model_name, device=device)
    _model_name = model_name
    _model_device = device
    _gpu_name = gpu_name()
    print(
        f"Loaded embedding model {model_name} on {device}"
        + (f" ({_gpu_name})" if _gpu_name else ""),
        flush=True
    )
    return _model


def encode_texts(texts: List[str], model_name: str):
    model = load_model(model_name)
    batch_size = int(os.getenv("EMBEDDING_ENCODE_BATCH_SIZE", "256"))
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=batch_size,
        show_progress_bar=False
    )
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
        return jsonify({
            "embeddings": encode_texts(texts, model_name),
            "model": model_name,
            "device": _model_device,
            "gpu": _gpu_name
        })
    except Exception as error:
        return jsonify({"error": str(error)}), 500


if __name__ == "__main__":
    port = int(os.getenv("EMBEDDING_SERVICE_PORT", "5055"))
    app.run(host="0.0.0.0", port=port)
