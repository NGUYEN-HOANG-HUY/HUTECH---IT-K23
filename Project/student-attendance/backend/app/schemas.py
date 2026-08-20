from datetime import datetime

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ClassIn(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None


class ClassOut(ClassIn):
    id: int
    student_count: int = 0

    class Config:
        from_attributes = True


class StudentIn(BaseModel):
    student_code: str
    full_name: str
    class_id: int


class StudentOut(BaseModel):
    id: int
    code: str | None = None
    student_code: str | None = None
    full_name: str
    class_id: int
    photo_path: str | None
    enrolled: bool = False
    has_embedding: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class TimetableIn(BaseModel):
    class_id: int
    weekday: int = Field(ge=0, le=6)
    start_time: str
    end_time: str
    room: str | None = None


class TimetableOut(TimetableIn):
    id: int
    class_code: str | None = None
    class_name: str | None = None

    class Config:
        from_attributes = True


class SessionOpenIn(BaseModel):
    class_id: int
    slot_id: int | None = None
    grace_minutes: int | None = None


class RecordOut(BaseModel):
    id: int
    student_id: int
    code: str | None = None
    student_code: str | None = None
    full_name: str | None = None
    student_name: str | None = None
    status: str
    recognized_at: datetime | None
    confidence: float | None
    snapshot_path: str | None


class SessionOut(BaseModel):
    id: int
    class_id: int
    class_name: str
    slot_id: int | None
    opened_at: datetime
    closed_at: datetime | None
    status: str
    grace_minutes: int
    present_count: int = 0
    late_count: int = 0
    absent_count: int = 0
    records: list[RecordOut] = Field(default_factory=list)


class MatchOut(BaseModel):
    student_id: int
    code: str | None = None
    student_code: str | None = None
    name: str
    student_name: str | None = None
    score: float
    status: str
    newly_marked: bool = False
    bbox: list[int] | None = None


class RecognizeOut(BaseModel):
    faces: int = 0
    faces_detected: int = 0
    matches: list[MatchOut]


class StudentReportRow(BaseModel):
    student_id: int
    student_code: str
    full_name: str
    sessions: int
    present: int
    late: int
    absent: int
    attendance_rate: float


class ReportOut(BaseModel):
    class_id: int
    class_name: str
    from_date: str | None
    to_date: str | None
    session_count: int
    students: list[StudentReportRow] = Field(default_factory=list)
