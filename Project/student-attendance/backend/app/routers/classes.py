from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import require_admin
from ..database import get_db

router = APIRouter(prefix="/classes", tags=["classes"])


def to_out(row: models.ClassRoom) -> schemas.ClassOut:
    return schemas.ClassOut(
        id=row.id,
        code=row.code,
        name=row.name,
        description=row.description,
        student_count=len(row.students),
    )


@router.get("", response_model=list[schemas.ClassOut])
def list_classes(db: Session = Depends(get_db), _: str = Depends(require_admin)):
    rows = db.query(models.ClassRoom).order_by(models.ClassRoom.code).all()
    return [to_out(r) for r in rows]


@router.post("", response_model=schemas.ClassOut)
def create_class(body: schemas.ClassIn, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    if db.query(models.ClassRoom).filter_by(code=body.code).first():
        raise HTTPException(400, "Mã lớp đã tồn tại")
    row = models.ClassRoom(code=body.code.strip(), name=body.name.strip(), description=body.description)
    db.add(row)
    db.commit()
    db.refresh(row)
    return to_out(row)


@router.get("/{class_id}", response_model=schemas.ClassOut)
def get_class(class_id: int, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    row = db.get(models.ClassRoom, class_id)
    if not row:
        raise HTTPException(404, "Không tìm thấy lớp")
    return to_out(row)


@router.put("/{class_id}", response_model=schemas.ClassOut)
def update_class(
    class_id: int, body: schemas.ClassIn, db: Session = Depends(get_db), _: str = Depends(require_admin)
):
    row = db.get(models.ClassRoom, class_id)
    if not row:
        raise HTTPException(404, "Không tìm thấy lớp")
    other = db.query(models.ClassRoom).filter(models.ClassRoom.code == body.code, models.ClassRoom.id != class_id).first()
    if other:
        raise HTTPException(400, "Mã lớp đã tồn tại")
    row.code = body.code.strip()
    row.name = body.name.strip()
    row.description = body.description
    db.commit()
    db.refresh(row)
    return to_out(row)


@router.delete("/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    row = db.get(models.ClassRoom, class_id)
    if not row:
        raise HTTPException(404, "Không tìm thấy lớp")
    db.delete(row)
    db.commit()
    return {"ok": True}
