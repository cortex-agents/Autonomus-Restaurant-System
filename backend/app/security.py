import json, os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status
from app.config import get_settings

pwd_context=CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(password, hashed): return pwd_context.verify(password, hashed)
def hash_password(password): return pwd_context.hash(password)

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
