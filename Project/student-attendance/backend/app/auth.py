import hashlib
import hmac

from fastapi import Depends, Header, HTTPException, status

from .config import ADMIN_PASSWORD, ADMIN_USERNAME, SECRET_KEY


def expected_token() -> str:
    raw = f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}".encode()
    return hmac.new(SECRET_KEY.encode(), raw, hashlib.sha256).hexdigest()


def login(username: str, password: str) -> str:
    if not hmac.compare_digest(username, ADMIN_USERNAME) or not hmac.compare_digest(
        password, ADMIN_PASSWORD
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sai tài khoản hoặc mật khẩu")
    return expected_token()


def require_admin(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cần đăng nhập")
    token = authorization.split(" ", 1)[1].strip()
    if not hmac.compare_digest(token, expected_token()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập không hợp lệ")
    return token
