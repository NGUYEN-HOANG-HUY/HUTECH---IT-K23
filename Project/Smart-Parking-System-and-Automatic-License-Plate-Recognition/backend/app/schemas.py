from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PlateRead(BaseModel):
    plate: str
    confidence: float = Field(ge=0, le=1)
    source: Literal['ocr', 'manual']


class ParkingSession(BaseModel):
    id: str
    entry_plate: str
    entry_at: datetime
    vehicle_type: Literal['motorbike', 'car']
    ticket_type: Literal['hourly', 'member']
    spot: str
    status: Literal['parked', 'exited', 'mismatch'] = 'parked'
    exit_plate: str | None = None
    exited_at: datetime | None = None
    fee: int | None = None


class EntryRequest(BaseModel):
    plate: str
    vehicle_type: Literal['motorbike', 'car'] = 'motorbike'
    ticket_type: Literal['hourly', 'member'] = 'hourly'


class ExitRequest(BaseModel):
    plate: str
    confirm_mismatch: bool = False


class ExitResponse(BaseModel):
    session: ParkingSession
    matched: bool
    fee: int
    warning: str | None = None
