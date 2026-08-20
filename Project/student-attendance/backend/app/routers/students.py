from uuid import uuid4

import cv2
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import require_admin
from ..config import FACES_DIR
from ..database import get_db
from ..face_service import engine, packing

router = APIRouter(prefix="/students", tags=["students"])


def to_out(s: models.Student) -> schemas.StudentOut:
    has_embedding = s.embedding is not None
    return schemas.StudentOut(
        id=s.id,
        code=s.student_code,
        student_code=s.student_code,
        full_name=s.full_name,
        class_id=s.class_id,
        photo_path=s.photo_path,
        enrolled=has_embedding,
        has_embedding=has_embedding,
        created_at=s.created_at,
    )


@router.get("", response_model=list[schemas.StudentOut])
def list_students(
    class_id: int | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    q = db.query(models.Student)
    if class_id is not None:
        q = q.filter(models.Student.class_id == class_id)
    return [to_out(s) for s in q.order_by(models.Student.student_code).all()]


@router.post("", response_model=schemas.StudentOut)
async def create_student(
    student_code: str = Form(...),
    full_name: str = Form(...),
    class_id: int = Form(...),
    photo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    if not db.get(models.ClassRoom, class_id):
        raise HTTPException(404, "Không tìm thấy lớp")
    if db.query(models.Student).filter_by(student_code=student_code.strip()).first():
        raise HTTPException(400, "Mã học viên đã tồn tại")
    student = models.Student(
        student_code=student_code.strip(),
        full_name=full_name.strip(),
        class_id=class_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    if photo is not None and photo.filename:
        await _enroll(db, student, photo)
    return to_out(student)


@router.put("/{student_id}", response_model=schemas.StudentOut)
async def update_student(
    student_id: int,
    student_code: str = Form(...),
    full_name: str = Form(...),
    class_id: int = Form(...),
    photo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    student = db.get(models.Student, student_id)
    if not student:
        raise HTTPException(404, "Không tìm thấy học viên")
    if not db.get(models.ClassRoom, class_id):
        raise HTTPException(404, "Không tìm thấy lớp")
    other = (
        db.query(models.Student)
        .filter(models.Student.student_code == student_code.strip(), models.Student.id != student_id)
        .first()
    )
    if other:
        raise HTTPException(400, "Mã học viên đã tồn tại")
    student.student_code = student_code.strip()
    student.full_name = full_name.strip()
    student.class_id = class_id
    db.commit()
    if photo is not None and photo.filename:
        await _enroll(db, student, photo)
    db.refresh(student)
    return to_out(student)


@router.post("/{student_id}/enroll", response_model=schemas.StudentOut)
async def enroll_student(
    student_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    student = db.get(models.Student, student_id)
    if not student:
        raise HTTPException(404, "Không tìm thấy học viên")
    await _enroll(db, student, photo)
    db.refresh(student)
    return to_out(student)


@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    student = db.get(models.Student, student_id)
    if not student:
        raise HTTPException(404, "Không tìm thấy học viên")
    db.delete(student)
    db.commit()
    return {"ok": True}


async def _enroll(db: Session, student: models.Student, photo: UploadFile) -> None:
    data = await photo.read()
    if not data:
        raise HTTPException(400, "File ảnh trống")
    try:
        embedding, crop = engine.enroll_embedding(data)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    FACES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{student.id}_{uuid4().hex}.jpg"
    path = FACES_DIR / filename
    if crop is None or crop.size == 0:
        raise HTTPException(400, "Không cắt được khuôn mặt")
    cv2.imwrite(str(path), crop)
    student.embedding = packing(embedding)
    student.photo_path = f"/uploads/faces/{filename}"
    db.commit()
