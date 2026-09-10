from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import Order, Restaurant
from app.deps import get_current_restaurant

router=APIRouter(prefix="/api/orders",tags=["orders"])
class StatusIn(BaseModel): status:str
allowed={"pending":"confirmed","confirmed":"preparing","preparing":"out_for_delivery","out_for_delivery":"delivered"}
terminal={"delivered","cancelled"}

@router.get("")
async def list_orders(status: str|None=None, page:int=Query(1,ge=1), page_size:int=Query(50,ge=1,le=100), restaurant:Restaurant=Depends(get_current_restaurant), session:AsyncSession=Depends(get_db)):
    q=select(Order).where(Order.restaurant_id==restaurant.id)
    if status:q=q.where(Order.status==status)
    q=q.order_by(Order.created_at.desc()).offset((page-1)*page_size).limit(page_size)
    rows=(await session.execute(q)).scalars().all()
    return {"items":[order_dict(o) for o in rows],"page":page,"page_size":page_size}

def order_dict(o):
    return {"id":str(o.id),"items":o.items,"subtotal":float(o.subtotal),"delivery_fee":float(o.delivery_fee),"total":float(o.total),"delivery_address":o.delivery_address,"payment_method":o.payment_method,"status":o.status,"created_at":o.created_at}

@router.get("/{id}")
async def get_order(id:UUID,restaurant:Restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    o=(await session.execute(select(Order).where(Order.id==id,Order.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not o:raise HTTPException(status_code=404,detail="Order not found")
    return order_dict(o)

@router.patch("/{id}/status")
async def update_status(id:UUID,body:StatusIn,restaurant:Restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    o=(await session.execute(select(Order).where(Order.id==id,Order.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not o:raise HTTPException(status_code=404,detail="Order not found")
    new=body.status
    if new=="cancelled":
        if o.status in terminal:raise HTTPException(status_code=400,detail="Invalid status transition")
    elif allowed.get(o.status)!=new:raise HTTPException(status_code=400,detail="Invalid status transition")
    o.status=new; await session.commit(); await session.refresh(o); return order_dict(o)
