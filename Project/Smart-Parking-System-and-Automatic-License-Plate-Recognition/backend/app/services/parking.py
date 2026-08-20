from datetime import datetime
from math import ceil
from uuid import uuid4

from ..schemas import EntryRequest, ExitResponse, ExitRequest, ParkingSession


def normalize_plate(value: str) -> str:
    return ''.join(value.upper().split()).replace('-', '').replace('.', '')


def calculate_fee(entry_at: datetime, exited_at: datetime, vehicle_type: str, ticket_type: str) -> int:
    hours = max(1, ceil((exited_at - entry_at).total_seconds() / 3600))
    hourly_rate = 15000 if vehicle_type == 'motorbike' else 30000
    fee = hourly_rate * hours
    return 0 if ticket_type == 'member' else fee


class ParkingService:
    def __init__(self) -> None:
        self.sessions: dict[str, ParkingSession] = {}

    def entry(self, request: EntryRequest) -> ParkingSession:
        session = ParkingSession(
            id=str(uuid4()), entry_plate=normalize_plate(request.plate),
            entry_at=datetime.now(), vehicle_type=request.vehicle_type,
            ticket_type=request.ticket_type, spot=f'B-{len(self.sessions) + 1:02d}',
        )
        self.sessions[session.id] = session
        return session

    def parked(self) -> list[ParkingSession]:
        return [session for session in self.sessions.values() if session.status == 'parked']

    def exit(self, session_id: str, request: ExitRequest) -> ExitResponse:
        session = self.sessions[session_id]
        now = datetime.now()
        matched = normalize_plate(request.plate) == normalize_plate(session.entry_plate)
        if not matched and not request.confirm_mismatch:
            return ExitResponse(session=session, matched=False, fee=0, warning='Exit plate does not match entry plate.')
        session.exit_plate = normalize_plate(request.plate)
        session.exited_at = now
        session.fee = calculate_fee(session.entry_at, now, session.vehicle_type, session.ticket_type)
        session.status = 'exited' if matched else 'mismatch'
        return ExitResponse(session=session, matched=matched, fee=session.fee, warning=None if matched else 'Mismatch confirmed by operator.')
