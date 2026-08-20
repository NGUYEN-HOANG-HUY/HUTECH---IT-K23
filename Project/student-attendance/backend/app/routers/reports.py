import csv
from datetime import datetime
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import require_admin
from ..database import get_db

router = APIRouter(prefix="/reports", tags=["reports"])


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise HTTPException(400, "Ngày phải dạng YYYY-MM-DD") from exc


def build_report(
    db: Session, class_id: int, from_date: str | None, to_date: str | None
) -> schemas.ReportOut:
    classroom = db.get(models.ClassRoom, class_id)
    if not classroom:
        raise HTTPException(404, "Không tìm thấy lớp")
    start = _parse_date(from_date)
    end = _parse_date(to_date)
    q = db.query(models.AttendanceSession).options(
        joinedload(models.AttendanceSession.records)
    ).filter(models.AttendanceSession.class_id == class_id, models.AttendanceSession.status == "closed")
    if start:
        q = q.filter(models.AttendanceSession.opened_at >= start)
    if end:
        q = q.filter(models.AttendanceSession.opened_at < datetime(end.year, end.month, end.day, 23, 59, 59))
    sessions = q.all()
    students = db.query(models.Student).filter(models.Student.class_id == class_id).order_by(models.Student.student_code).all()
    rows = []
    for st in students:
        present = late = absent = 0
        for sess in sessions:
            rec = next((r for r in sess.records if r.student_id == st.id), None)
            if rec is None or rec.status == "absent":
                absent += 1
            elif rec.status == "late":
                late += 1
            else:
                present += 1
        total = len(sessions)
        rate = round(((present + late) / total) * 100, 1) if total else 0.0
        rows.append(
            schemas.StudentReportRow(
                student_id=st.id,
                student_code=st.student_code,
                full_name=st.full_name,
                sessions=total,
                present=present,
                late=late,
                absent=absent,
                attendance_rate=rate,
            )
        )
    return schemas.ReportOut(
        class_id=class_id,
        class_name=classroom.name,
        from_date=from_date,
        to_date=to_date,
        session_count=len(sessions),
        students=rows,
    )


@router.get("/attendance", response_model=schemas.ReportOut)
def attendance_report(
    class_id: int = Query(...),
    from_date: str | None = None,
    to_date: str | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    return build_report(db, class_id, from_date, to_date)


@router.get("/attendance.csv")
def attendance_csv(
    class_id: int = Query(...),
    from_date: str | None = None,
    to_date: str | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    report = build_report(db, class_id, from_date, to_date)
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Mã HV", "Họ tên", "Số buổi", "Có mặt", "Muộn", "Vắng", "Tỷ lệ (%)"])
    for s in report.students:
        writer.writerow(
            [s.student_code, s.full_name, s.sessions, s.present, s.late, s.absent, s.attendance_rate]
        )
    buf.seek(0)
    filename = f"bao-cao-{report.class_id}.csv"
    return StreamingResponse(
        iter(["\ufeff" + buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
