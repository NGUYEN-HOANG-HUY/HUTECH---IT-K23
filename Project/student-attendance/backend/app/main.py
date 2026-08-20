from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import UPLOAD_DIR
from .database import Base, engine
from .routers import auth, classes, reports, sessions, students, timetable

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "faces").mkdir(exist_ok=True)
(UPLOAD_DIR / "snapshots").mkdir(exist_ok=True)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Điểm danh & Nhận diện Học viên", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(classes.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(timetable.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}
