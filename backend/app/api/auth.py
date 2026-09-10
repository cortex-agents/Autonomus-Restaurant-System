from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.security import load_accounts, verify_password, create_access_token, create_refresh_token, decode_token

router=APIRouter(prefix="/api/auth",tags=["auth"])
class LoginIn(BaseModel): email: EmailStr; password: str
class RefreshIn(BaseModel): refresh_token: str

@router.post("/login")
async def login(body: LoginIn):
    account=next((a for a in load_accounts() if a.get("email"," ").lower()==body.email.lower()),None)
    if not account or not verify_password(body.password,account["password_hash"]): raise HTTPException(status_code=401,detail="Invalid email or password")
    rid=account["restaurant_id"]
    return {"access_token":create_access_token(rid,body.email),"refresh_token":create_refresh_token(rid,body.email),"token_type":"bearer"}

@router.post("/refresh")
async def refresh(body: RefreshIn):
    payload=decode_token(body.refresh_token,allow_refresh=True)
    if payload.get("type")!="refresh": raise HTTPException(status_code=401,detail="Refresh token required")
    return {"access_token":create_access_token(payload["restaurant_id"],payload["sub"]),"token_type":"bearer"}
