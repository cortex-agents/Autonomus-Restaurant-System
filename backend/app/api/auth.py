from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.security import load_accounts, verify_password, create_access_token, create_refresh_token, decode_token
from app.db.session import get_db
from app.db.models import Restaurant
from app.deps import get_current_restaurant

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
async def refresh(body: RefreshIn, session: AsyncSession = Depends(get_db)):
    payload=decode_token(body.refresh_token,allow_refresh=True)
    if payload.get("type")!="refresh": raise HTTPException(status_code=401,detail="Refresh token required")
    # 🆕 Reject refresh if the restaurant was deactivated/deleted since the token was issued.
    r=(await session.execute(select(Restaurant).where(Restaurant.id==payload["restaurant_id"]))).scalar_one_or_none()
    if not r or not r.is_active: raise HTTPException(status_code=401,detail="Restaurant account no longer active")
    return {"access_token":create_access_token(payload["restaurant_id"],payload["sub"]),"token_type":"bearer"}

# 🆕 Dashboard's "who am I" endpoint — call right after login to get restaurant identity.
@router.get("/me")
async def me(restaurant=Depends(get_current_restaurant)):
    return {"id":str(restaurant.id),"name":restaurant.name,"whatsapp_number":restaurant.whatsapp_number,"timezone":restaurant.timezone}