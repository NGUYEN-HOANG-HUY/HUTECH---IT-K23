from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .schemas import EntryRequest, ExitRequest, ExitResponse, ParkingSession, PlateRead
from .services.ocr import read_plate
from .services.parking import ParkingService

app = FastAPI(title='Smart Parking API', version='0.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
service = ParkingService()


@app.get('/api/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'smart-parking-api'}


@app.post('/api/ocr', response_model=PlateRead)
async def ocr(file: UploadFile = File(...)) -> PlateRead:
    result = read_plate(await file.read())
    if result.get('error'):
        raise HTTPException(status_code=422, detail=result['error'])
    return PlateRead(**result)


@app.get('/api/sessions', response_model=list[ParkingSession])
def sessions() -> list[ParkingSession]:
    return service.parked()


@app.post('/api/sessions/entry', response_model=ParkingSession, status_code=201)
def entry(request: EntryRequest) -> ParkingSession:
    return service.entry(request)


@app.post('/api/sessions/{session_id}/exit', response_model=ExitResponse)
def exit_session(session_id: str, request: ExitRequest) -> ExitResponse:
    if session_id not in service.sessions:
        raise HTTPException(status_code=404, detail='Parking session not found.')
    return service.exit(session_id, request)
