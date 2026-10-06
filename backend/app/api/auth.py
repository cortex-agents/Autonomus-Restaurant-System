import time
from collections import defaultdict, deque
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.security import load_accounts, verify_password, hash_password, create_access_token, create_refresh_token, decode_token
from app.db.session import get_db
from app.db.models import Restaurant, OwnerUser
from app.deps import get_current_restaurant

router=APIRouter(prefix="/api/auth",tags=["auth"])
class LoginIn(BaseModel): email: EmailStr; password: str
class RefreshIn(BaseModel): refresh_token: str
class ChangePasswordIn(BaseModel): current_password: str; new_password: str = Field(min_length=8)

# Simple in-memory brute-force guard (single-process MVP): 10 failures / 15 min per email+IP.
_FAILS: dict[str,deque]=defaultdict(deque)
_MAX_FAILS=10; _WINDOW=15*60

def _fail_key(email,request): return f"{email.lower()}|{request.client.host if request.client else '-'}"
def _recent_fails(key):
    q=_FAILS[key]; now=time.monotonic()
    while q and now-q[0]>_WINDOW: q.popleft()
    return q

async def _owner_user_by_email(session: AsyncSession, email: str) -> OwnerUser | None:
    lowered = email.strip().lower()
    return (await session.execute(select(OwnerUser).where(OwnerUser.email == lowered))).scalar_one_or_none()

@router.post("/login")
async def login(body: LoginIn, request: Request, session: AsyncSession = Depends(get_db)):
    normalized_email = body.email.lower()
    key=_fail_key(body.email,request)
    if len(_recent_fails(key))>=_MAX_FAILS: raise HTTPException(status_code=429,detail="Too many failed attempts. Try again later.")
    owner = await _owner_user_by_email(session, normalized_email)
    if owner:
        if not owner.is_active or not verify_password(body.password, owner.password_hash):
            _recent_fails(key).append(time.monotonic())
            raise HTTPException(status_code=401,detail="Invalid email or password")
        rid = owner.restaurant_id
    else:
        account=next((a for a in load_accounts() if a.get("email"," ").lower()==normalized_email),None)
        if not account or not verify_password(body.password,account["password_hash"]):
            _recent_fails(key).append(time.monotonic())
            raise HTTPException(status_code=401,detail="Invalid email or password")
        rid=account["restaurant_id"]

    r=(await session.execute(select(Restaurant).where(Restaurant.id==rid))).scalar_one_or_none()
    if not r or not r.is_active:
        _recent_fails(key).append(time.monotonic())
        raise HTTPException(status_code=401,detail="Invalid email or password")
    _FAILS.pop(key,None)
    return {"access_token":create_access_token(rid,normalized_email),"refresh_token":create_refresh_token(rid,normalized_email),"token_type":"bearer"}

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
async def me(authorization: str | None = Header(default=None), restaurant=Depends(get_current_restaurant)):
    owner_email = None
    if authorization and authorization.lower().startswith("bearer "):
        payload = decode_token(authorization.split(" ", 1)[1])
        owner_email = payload.get("sub")
    return {
        "id":str(restaurant.id),
        "name":restaurant.name,
        "whatsapp_number":restaurant.whatsapp_number,
        "phone_number_id":restaurant.phone_number_id,
        "timezone":restaurant.timezone,
        "owner_email":owner_email,
    }

@router.post("/change-password")
async def change_password(
    body: ChangePasswordIn,
    authorization: str | None = Header(default=None),
    restaurant=Depends(get_current_restaurant),
    session: AsyncSession = Depends(get_db),
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(authorization.split(" ", 1)[1])
    email = (payload.get("sub") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token subject")
    owner = (await session.execute(select(OwnerUser).where(
        OwnerUser.restaurant_id == restaurant.id,
        OwnerUser.email == email,
        OwnerUser.is_active.is_(True),
    ))).scalar_one_or_none()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner account not found")
    if not verify_password(body.current_password, owner.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    owner.password_hash = hash_password(body.new_password)
    await session.commit()
    return {"ok": True}