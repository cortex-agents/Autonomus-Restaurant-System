from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import Order, Restaurant, Customer, Escalation
from app.deps import get_current_restaurant
from app.channels import get_channel
import logging

router=APIRouter(prefix="/api/orders",tags=["orders"])
logger = logging.getLogger(__name__)
class StatusIn(BaseModel): status:str
allowed={"pending":"confirmed","confirmed":"preparing","preparing":"out_for_delivery","out_for_delivery":"delivered"}
terminal={"delivered","cancelled"}

@router.get("")
async def list_orders(status: str|None=None, page:int=Query(1,ge=1), page_size:int=Query(50,ge=1,le=100), restaurant:Restaurant=Depends(get_current_restaurant), session:AsyncSession=Depends(get_db)):
    q=select(Order, Customer).join(Customer, Customer.id == Order.customer_id).where(Order.restaurant_id==restaurant.id, Customer.restaurant_id==restaurant.id)
    if status:q=q.where(Order.status==status)
    q=q.order_by(Order.created_at.desc()).offset((page-1)*page_size).limit(page_size)
    rows=(await session.execute(q)).all()
    count_q=select(func.count()).select_from(Order).where(Order.restaurant_id==restaurant.id)
    if status:count_q=count_q.where(Order.status==status)
    total=(await session.execute(count_q)).scalar_one()
    return {"items":[order_dict(o, customer) for o, customer in rows],"page":page,"page_size":page_size,"total":total}

def order_dict(o, customer=None):
    return {
        "id":str(o.id),"conversation_id":str(o.conversation_id) if o.conversation_id else None,
        "customer":{"id":str(customer.id),"name":customer.name,"phone":customer.phone} if customer else None,
        "items":o.items,"subtotal":float(o.subtotal),"delivery_fee":float(o.delivery_fee),
        "total":float(o.total),"delivery_address":o.delivery_address,
        "payment_method":o.payment_method,"status":o.status,"created_at":o.created_at,
    }

@router.get("/{id}")
async def get_order(id:UUID,restaurant:Restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    row=(await session.execute(select(Order, Customer).join(Customer, Customer.id == Order.customer_id).where(Order.id==id,Order.restaurant_id==restaurant.id,Customer.restaurant_id==restaurant.id))).first()
    if not row:raise HTTPException(status_code=404,detail="Order not found")
    o, customer = row
    return order_dict(o, customer)

@router.patch("/{id}/status")
async def update_status(id:UUID,body:StatusIn,restaurant:Restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    o=(await session.execute(select(Order).where(Order.id==id,Order.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not o:raise HTTPException(status_code=404,detail="Order not found")
    new=body.status
    if new=="cancelled":
        if o.status in terminal:raise HTTPException(status_code=400,detail="Invalid status transition")
    elif allowed.get(o.status)!=new:raise HTTPException(status_code=400,detail="Invalid status transition")
    o.status=new
    await session.commit()
    await session.refresh(o)
    customer=(await session.execute(select(Customer).where(Customer.id==o.customer_id,Customer.restaurant_id==restaurant.id))).scalar_one()
    try:
        await get_channel().send_message(
            restaurant.phone_number_id,
            customer.phone,
            f"Order update: your order is now {new.replace('_', ' ')}.",
        )
    except Exception:
        logger.exception("Order status notification failed (restaurant=%s, order=%s)", restaurant.id, o.id)
        if o.conversation_id:
            session.add(Escalation(
                restaurant_id=restaurant.id,
                conversation_id=o.conversation_id,
                reason=f"Failed to send order status notification for order {o.id}",
            ))
            await session.commit()
    return order_dict(o, customer)
