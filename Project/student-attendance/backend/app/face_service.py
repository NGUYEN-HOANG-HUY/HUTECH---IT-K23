from __future__ import annotations

import threading

import cv2
import numpy as np

from .config import FACE_THRESHOLD


class FaceEngine:
    def __init__(self) -> None:
        self._app = None
        self._lock = threading.Lock()

    def _ensure(self):
        if self._app is not None:
            return self._app
        with self._lock:
            if self._app is not None:
                return self._app
            from insightface.app import FaceAnalysis

            app = FaceAnalysis(name="buffalo_sc", providers=["CPUExecutionProvider"])
            app.prepare(ctx_id=-1, det_size=(640, 640))
            self._app = app
            return self._app

    def decode_image(self, data: bytes) -> np.ndarray:
        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Không đọc được ảnh")
        return img

    def detect(self, image_bgr: np.ndarray):
        app = self._ensure()
        return app.get(image_bgr)

    def enroll_embedding(self, image_bytes: bytes) -> tuple[np.ndarray, np.ndarray]:
        img = self.decode_image(image_bytes)
        faces = self.detect(img)
        if len(faces) == 0:
            raise ValueError("Không phát hiện khuôn mặt. Hãy dùng ảnh rõ, nhìn thẳng.")
        if len(faces) > 1:
            raise ValueError("Ảnh có nhiều hơn một khuôn mặt. Hãy cắt ảnh chỉ còn một người.")
        face = faces[0]
        emb = np.asarray(face.normed_embedding, dtype=np.float32)
        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        crop = img[max(0, y1) : max(0, y2), max(0, x1) : max(0, x2)]
        return emb, crop

    def embeddings_from_frame(self, image_bytes: bytes) -> list[tuple[np.ndarray, list[int]]]:
        img = self.decode_image(image_bytes)
        faces = self.detect(img)
        out = []
        for face in faces:
            emb = np.asarray(face.normed_embedding, dtype=np.float32)
            bbox = [int(v) for v in face.bbox]
            out.append((emb, bbox))
        return out


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = a.astype(np.float32).ravel()
    b = b.astype(np.float32).ravel()
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def match_student(
    query: np.ndarray,
    gallery: list[tuple[int, np.ndarray]],
    threshold: float = FACE_THRESHOLD,
) -> tuple[int | None, float]:
    best_id = None
    best_score = -1.0
    for sid, emb in gallery:
        score = cosine_similarity(query, emb)
        if score > best_score:
            best_score = score
            best_id = sid
    if best_id is None or best_score < threshold:
        return None, best_score
    return best_id, best_score


def packing(emb: np.ndarray) -> bytes:
    return np.asarray(emb, dtype=np.float32).tobytes()


def unpacking(blob: bytes) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32).copy()


engine = FaceEngine()
