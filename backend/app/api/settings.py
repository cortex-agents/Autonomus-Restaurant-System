from datetime import time
from decimal import Decimal
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.deps import get_current_restaurant
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router=APIRouter(prefix="/api/settings",tags=["settings"])
class SettingsIn(BaseModel):
    opening_time:time|None=None; closing_time:time|None=None; delivery_radius_km:Decimal|None=Field(default=None,ge=0); delivery_fee:Decimal|None=Field(default=None,ge=0); min_order_amount:Decimal|None=Field(default=None,ge=0); brand_voice:str|None=None; timezone:str|None=None

def out(r):return {"opening_time":r.opening_time,"closing_time":r.closing_time,"delivery_radius_km":float(r.delivery_radius_km) if r.delivery_radius_km is not None else None,"delivery_fee":float(r.delivery_fee),"min_order_amount":float(r.min_order_amount),"brand_voice":r.brand_voice,"timezone":r.timezone}
@router.get("")
async def get_settings(restaurant=Depends(get_current_restaurant)):return out(restaurant)
@router.patch("")
async def patch_settings(body:SettingsIn,restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    for k,v in body.model_dump(exclude_unset=True).items():setattr(restaurant,k,v)
    await session.commit();await session.refresh(restaurant);return out(restaurant)
