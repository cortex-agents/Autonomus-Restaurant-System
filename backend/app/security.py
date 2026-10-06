import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from jose import jwt, JWTError
import bcrypt
from fastapi import HTTPException
from app.config import get_settings

def _password_bytes(password: str) -> bytes:
    value = password.encode("utf-8")
    if len(value) > 72:
        raise ValueError("Password must be no longer than 72 UTF-8 bytes")
    return value


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_password_bytes(password), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("utf-8")

def load_accounts():
    p=Path(get_settings().owner_accounts_file)
    if not p.exists(): return []
    try:return json.loads(p.read_text())
    except Exception:return []

def create_access_token(restaurant_id, subject, expires_minutes=None):
    s=get_settings(); mins=expires_minutes or s.jwt_expire_minutes
    now=datetime.now(timezone.utc); exp=now+timedelta(minutes=mins)
    return jwt.encode({"sub":subject,"restaurant_id":str(restaurant_id),"type":"access","iat":int(now.timestamp()),"exp":exp},s.dashboard_jwt_secret,algorithm=s.jwt_algorithm)

def create_refresh_token(restaurant_id, subject):
    s=get_settings(); now=datetime.now(timezone.utc); exp=now+timedelta(days=7)
    return jwt.encode({"sub":subject,"restaurant_id":str(restaurant_id),"type":"refresh","iat":int(now.timestamp()),"exp":exp},s.dashboard_jwt_secret,algorithm=s.jwt_algorithm)

def decode_token(token, allow_refresh=False):
    s=get_settings()
    try:
        payload=jwt.decode(token,s.dashboard_jwt_secret,algorithms=[s.jwt_algorithm],options={"verify_exp":True})
    except JWTError as e: raise HTTPException(status_code=401,detail="Invalid or expired token") from e
    if payload.get("type") == "refresh" and not allow_refresh: raise HTTPException(status_code=401,detail="Access token required")
    if not payload.get("restaurant_id"): raise HTTPException(status_code=401,detail="Invalid tenant claim")
    return payload
