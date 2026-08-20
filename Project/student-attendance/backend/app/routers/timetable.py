import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..auth import require_admin
from ..database import get_db

router = APIRouter(prefix="/timetable", tags=["timetable"])
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _validate(body: schemas.TimetableIn) -> None:
    if not TIME_RE.match(body.start_time) or not TIME_RE.match(body.end_time):
        raise HTTPException(400, "Giờ phải dạng HH:MM")
    if body.start_time >= body.end_time:
        raise HTTPException(400, "Giờ kết thúc phải sau giờ bắt đầu")


def _slot_out(s: models.TimetableSlot) -> schemas.TimetableOut:
    return schemas.TimetableOut(
        id=s.id,
        class_id=s.class_id,
        weekday=s.weekday,
        start_time=s.start_time,
        end_time=s.end_time,
        room=s.room,
        class_code=s.classroom.code if s.classroom else None,
        class_name=s.classroom.name if s.classroom else None,
    )


@router.get("", response_model=list[schemas.TimetableOut])
def list_slots(
    class_id: int | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    q = db.query(models.TimetableSlot).options(selectinload(models.TimetableSlot.classroom))
    if class_id is not None:
        q = q.filter(models.TimetableSlot.class_id == class_id)
    rows = q.order_by(models.TimetableSlot.weekday, models.TimetableSlot.start_time).all()
    return [_slot_out(s) for s in rows]


@router.post("", response_model=schemas.TimetableOut)
def create_slot(body: schemas.TimetableIn, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    _validate(body)
    if not db.get(models.ClassRoom, body.class_id):
        raise HTTPException(404, "Không tìm thấy lớp")
    row = models.TimetableSlot(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _slot_out(row)


@router.put("/{slot_id}", response_model=schemas.TimetableOut)
def update_slot(
    slot_id: int, body: schemas.TimetableIn, db: Session = Depends(get_db), _: str = Depends(require_admin)
):
    _validate(body)
    row = db.get(models.TimetableSlot, slot_id)
    if not row:
        raise HTTPException(404, "Không tìm thấy tiết học")
    if not db.get(models.ClassRoom, body.class_id):
        raise HTTPException(404, "Không tìm thấy lớp")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _slot_out(row)


@router.delete("/{slot_id}")
def delete_slot(slot_id: int, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    row = db.get(models.TimetableSlot, slot_id)
    if not row:
        raise HTTPException(404, "Không tìm thấy tiết học")
    db.delete(row)
    db.commit()
    return {"ok": True}
