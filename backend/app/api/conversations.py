from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from app.deps import get_current_restaurant
from app.db.session import get_db
from app.db.models import Conversation, Message

router=APIRouter(prefix="/api/conversations",tags=["conversations"])
@router.get("/{id}")
async def transcript(id:UUID,restaurant=Depends(get_current_restaurant),session=Depends(get_db)):
    c=(await session.execute(select(Conversation).where(Conversation.id==id,Conversation.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not c:raise HTTPException(status_code=404,detail="Conversation not found")
    msgs=(await session.execute(select(Message).where(Message.conversation_id==c.id).order_by(Message.created_at))).scalars().all()
    return {"id":str(c.id),"status":c.status,"order_stage":c.order_stage,"messages":[{"id":str(m.id),"direction":m.direction,"role":m.role,"content":m.content,"created_at":m.created_at} for m in msgs]}
