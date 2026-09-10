from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from app.deps import get_current_restaurant
from app.db.session import get_db
from app.db.models import Escalation, Conversation, Message, Customer
from app.channels.whatsapp.handler import WhatsAppHandler

router=APIRouter(prefix="/api/escalations",tags=["escalations"])
class ReplyIn(BaseModel): content:str
@router.get("")
async def list_escalations(status:str|None=None,restaurant=Depends(get_current_restaurant),session=Depends(get_db)):
    q=select(Escalation).where(Escalation.restaurant_id==restaurant.id)
    if status:q=q.where(Escalation.status==status)
    rows=(await session.execute(q.order_by(Escalation.created_at.desc()))).scalars().all()
    return [{"id":str(e.id),"reason":e.reason,"status":e.status,"created_at":e.created_at,"resolved_at":e.resolved_at} for e in rows]
@router.get("/{id}")
async def detail(id:UUID,restaurant=Depends(get_current_restaurant),session=Depends(get_db)):
    e=(await session.execute(select(Escalation).where(Escalation.id==id,Escalation.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not e:raise HTTPException(status_code=404,detail="Escalation not found")
    msgs=(await session.execute(select(Message).where(Message.conversation_id==e.conversation_id).order_by(Message.created_at))).scalars().all()
    return {"id":str(e.id),"reason":e.reason,"status":e.status,"messages":[{"id":str(m.id),"direction":m.direction,"role":m.role,"content":m.content,"created_at":m.created_at} for m in msgs]}
@router.post("/{id}/reply")
async def reply(id:UUID,body:ReplyIn,restaurant=Depends(get_current_restaurant),session=Depends(get_db)):
    e=(await session.execute(select(Escalation).where(Escalation.id==id,Escalation.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not e:raise HTTPException(status_code=404,detail="Escalation not found")
    c=(await session.execute(select(Conversation).where(Conversation.id==e.conversation_id,Conversation.restaurant_id==restaurant.id))).scalar_one()
    customer=(await session.execute(select(Customer).where(Customer.id==c.customer_id,Customer.restaurant_id==restaurant.id))).scalar_one()
    # The schema's whatsapp_number is the restaurant receiving number. The customer phone is the reply destination.
    await WhatsAppHandler().send_message(restaurant.whatsapp_number,customer.phone,body.content)
    session.add(Message(conversation_id=c.id,direction="outbound",role="system",content=body.content)); await session.commit()
    e.status="acknowledged"; await session.commit()
    return {"ok":True}
@router.patch("/{id}/resolve")
async def resolve(id:UUID,restaurant=Depends(get_current_restaurant),session=Depends(get_db)):
    e=(await session.execute(select(Escalation).where(Escalation.id==id,Escalation.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not e:raise HTTPException(status_code=404,detail="Escalation not found")
    e.status="resolved";e.resolved_at=datetime.now(timezone.utc);await session.commit();return {"ok":True,"status":e.status,"resolved_at":e.resolved_at}
