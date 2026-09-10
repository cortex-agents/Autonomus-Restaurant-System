from uuid import UUID
from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.security import decode_token
from app.db.models import Restaurant
from sqlalchemy import select

async def get_current_restaurant(authorization: str | None = Header(default=None), session: AsyncSession = Depends(get_db)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401,detail="Not authenticated")
    payload=decode_token(authorization.split(" ",1)[1])
    rid=UUID(payload["restaurant_id"])
    restaurant=(await session.execute(select(Restaurant).where(Restaurant.id==rid))).scalar_one_or_none()
    if not restaurant: raise HTTPException(status_code=401,detail="Restaurant not found")
    if not restaurant.is_active: raise HTTPException(status_code=403,detail="Restaurant inactive")
    return restaurant
