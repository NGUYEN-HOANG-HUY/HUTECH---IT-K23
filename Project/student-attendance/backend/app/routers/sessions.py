from datetime import datetime, timedelta
from uuid import uuid4

import cv2
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import require_admin
from ..config import FACE_THRESHOLD, GRACE_MINUTES, SNAPSHOTS_DIR
from ..database import get_db
from ..face_service import engine, match_student, unpacking

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _record_out(r: models.AttendanceRecord) -> schemas.RecordOut:
    return schemas.RecordOut(
        id=r.id,
        student_id=r.student_id,
        code=r.student.student_code,
        student_code=r.student.student_code,
        full_name=r.student.full_name,
        student_name=r.student.full_name,
        status=r.status,
        recognized_at=r.recognized_at,
        confidence=r.confidence,
        snapshot_path=r.snapshot_path,
    )


def _session_out(s: models.AttendanceSession, include_records: bool = True) -> schemas.SessionOut:
    present = late = absent = 0
    records = []
    for r in s.records:
        if r.status == "present":
            present += 1
        elif r.status == "late":
            late += 1
        elif r.status == "absent":
            absent += 1
        if include_records:
            records.append(_record_out(r))
    return schemas.SessionOut(
        id=s.id,
        class_id=s.class_id,
        class_name=s.classroom.name,
        slot_id=s.slot_id,
        opened_at=s.opened_at,
        closed_at=s.closed_at,
        status=s.status,
        grace_minutes=s.grace_minutes,
        present_count=present,
        late_count=late,
        absent_count=absent,
        records=records if include_records else [],
    )


def _current_slot(db: Session, class_id: int) -> models.TimetableSlot | None:
    now = datetime.now()
    weekday = now.weekday()  # Monday=0
    hhmm = now.strftime("%H:%M")
    slots = (
        db.query(models.TimetableSlot)
        .filter(models.TimetableSlot.class_id == class_id, models.TimetableSlot.weekday == weekday)
        .all()
    )
    for slot in slots:
        if slot.start_time <= hhmm <= slot.end_time:
            return slot
    return None


def _attendance_status(session: models.AttendanceSession) -> str:
    deadline = session.opened_at + timedelta(minutes=session.grace_minutes)
    return "late" if datetime.utcnow() > deadline else "present"


@router.get("", response_model=list[schemas.SessionOut])
def list_sessions(
    class_id: int | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    q = db.query(models.AttendanceSession).options(
        joinedload(models.AttendanceSession.classroom),
        joinedload(models.AttendanceSession.records).joinedload(models.AttendanceRecord.student),
    )
    if class_id is not None:
        q = q.filter(models.AttendanceSession.class_id == class_id)
    rows = q.order_by(models.AttendanceSession.opened_at.desc()).all()
    return [_session_out(s, include_records=False) for s in rows]


@router.get("/{session_id}", response_model=schemas.SessionOut)
def get_session(session_id: int, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    s = _load_session(db, session_id)
    return _session_out(s)


@router.post("", response_model=schemas.SessionOut)
def open_session(body: schemas.SessionOpenIn, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    classroom = db.get(models.ClassRoom, body.class_id)
    if not classroom:
        raise HTTPException(404, "Không tìm thấy lớp")
    existing = (
        db.query(models.AttendanceSession)
        .filter(models.AttendanceSession.class_id == body.class_id, models.AttendanceSession.status == "open")
        .first()
    )
    if existing:
        raise HTTPException(400, f"Lớp đang có phiên điểm danh #{existing.id} chưa đóng")
    slot_id = body.slot_id
    if slot_id is None:
        slot = _current_slot(db, body.class_id)
        slot_id = slot.id if slot else None
    elif not db.get(models.TimetableSlot, slot_id):
        raise HTTPException(404, "Không tìm thấy tiết học")
    session = models.AttendanceSession(
        class_id=body.class_id,
        slot_id=slot_id,
        grace_minutes=body.grace_minutes or GRACE_MINUTES,
        status="open",
        opened_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    return _session_out(_load_session(db, session.id))


@router.post("/{session_id}/close", response_model=schemas.SessionOut)
def close_session(session_id: int, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    session = _load_session(db, session_id)
    if session.status == "closed":
        return _session_out(session)
    marked = {r.student_id for r in session.records}
    students = db.query(models.Student).filter(models.Student.class_id == session.class_id).all()
    for student in students:
        if student.id not in marked:
            db.add(
                models.AttendanceRecord(
                    session_id=session.id,
                    student_id=student.id,
                    status="absent",
                )
            )
    session.status = "closed"
    session.closed_at = datetime.utcnow()
    db.commit()
    return _session_out(_load_session(db, session.id))


@router.post("/{session_id}/recognize", response_model=schemas.RecognizeOut)
async def recognize(
    session_id: int,
    frame: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    session = _load_session(db, session_id)
    if session.status != "open":
        raise HTTPException(400, "Phiên điểm danh đã đóng")
    data = await frame.read()
    try:
        detections = engine.embeddings_from_frame(data)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    gallery = []
    for st in session.classroom.students:
        if st.embedding:
            gallery.append((st.id, unpacking(st.embedding)))

    existing = {r.student_id: r for r in session.records}
    matches: list[schemas.MatchOut] = []
    used_ids: set[int] = set()

    SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    img = engine.decode_image(data)

    for emb, bbox in detections:
        sid, score = match_student(emb, gallery, FACE_THRESHOLD)
        if sid is None or sid in used_ids:
            continue
        used_ids.add(sid)
        student = next(s for s in session.classroom.students if s.id == sid)
        rec = existing.get(sid)
        newly_marked = rec is None or rec.status == "absent"
        if rec is None or rec.status == "absent":
            x1, y1, x2, y2 = bbox
            crop = img[max(0, y1) : max(0, y2), max(0, x1) : max(0, x2)]
            snap_name = f"{session.id}_{sid}_{uuid4().hex}.jpg"
            snap_rel = None
            if crop is not None and crop.size > 0:
                cv2.imwrite(str(SNAPSHOTS_DIR / snap_name), crop)
                snap_rel = f"/uploads/snapshots/{snap_name}"
            status = _attendance_status(session)
            if rec is None:
                rec = models.AttendanceRecord(
                    session_id=session.id,
                    student_id=sid,
                    status=status,
                    recognized_at=datetime.utcnow(),
                    confidence=score,
                    snapshot_path=snap_rel,
                )
                db.add(rec)
                existing[sid] = rec
            else:
                rec.status = status
                rec.recognized_at = datetime.utcnow()
                rec.confidence = score
                rec.snapshot_path = snap_rel
            db.commit()
            db.refresh(rec)
        matches.append(
            schemas.MatchOut(
                student_id=sid,
                code=student.student_code,
                student_code=student.student_code,
                name=student.full_name,
                student_name=student.full_name,
                score=round(score, 4),
                status=existing[sid].status,
                newly_marked=newly_marked,
                bbox=bbox,
            )
        )
    return schemas.RecognizeOut(faces=len(detections), faces_detected=len(detections), matches=matches)


def _load_session(db: Session, session_id: int) -> models.AttendanceSession:
    s = (
        db.query(models.AttendanceSession)
        .options(
            joinedload(models.AttendanceSession.classroom).joinedload(models.ClassRoom.students),
            joinedload(models.AttendanceSession.records).joinedload(models.AttendanceRecord.student),
        )
        .filter(models.AttendanceSession.id == session_id)
        .first()
    )
    if not s:
        raise HTTPException(404, "Không tìm thấy phiên điểm danh")
    return s
