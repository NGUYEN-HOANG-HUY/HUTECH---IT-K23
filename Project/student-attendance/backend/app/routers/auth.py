from fastapi import APIRouter, Depends

from .. import schemas
from ..auth import login, require_admin

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenOut)
def do_login(body: schemas.LoginIn):
    token = login(body.username, body.password)
    return schemas.TokenOut(access_token=token)


@router.get("/me")
def me(_: str = Depends(require_admin)):
    return {"ok": True}
