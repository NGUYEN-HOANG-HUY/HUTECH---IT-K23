from pathlib import Path

from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
FACE_THRESHOLD = float(os.getenv("FACE_THRESHOLD", "0.45"))
GRACE_MINUTES = int(os.getenv("GRACE_MINUTES", "10"))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'attendance.db'}")
UPLOAD_DIR = BASE_DIR / "uploads"
FACES_DIR = UPLOAD_DIR / "faces"
SNAPSHOTS_DIR = UPLOAD_DIR / "snapshots"
