from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from app.deps import get_current_restaurant
from app.db.session import get_db
from app.db.models import Conversation, Message, Customer

router=APIRouter(prefix="/api/conversations",tags=["conversations"])

@router.get("")
async def list_conversations(
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    restaurant=Depends(get_current_restaurant),
    session=Depends(get_db),
):
    q=select(Conversation, Customer.phone).join(Customer, Customer.id == Conversation.customer_id).where(Conversation.restaurant_id==restaurant.id)
    if status: q=q.where(Conversation.status==status)
    rows=(await session.execute(q.order_by(Conversation.started_at.desc()).offset((page-1)*page_size).limit(page_size))).all()
    return {
        "items": [
            {
                "id": str(c.id),
                "customer_phone": phone,
                "status": c.status,
                "order_stage": c.order_stage,
                "started_at": c.started_at,
                "last_activity_at": c.last_activity_at,
                "escalated_reason": c.escalated_reason,
            }
            for c, phone in rows
        ],
        "page": page,
        "page_size": page_size,
    }

@router.get("/{id}")
async def transcript(id:UUID,restaurant=Depends(get_current_restaurant),session=Depends(get_db)):
    c=(await session.execute(select(Conversation).where(Conversation.id==id,Conversation.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not c:raise HTTPException(status_code=404,detail="Conversation not found")
    msgs=(await session.execute(select(Message).where(Message.conversation_id==c.id).order_by(Message.created_at))).scalars().all()
    return {"id":str(c.id),"status":c.status,"order_stage":c.order_stage,"messages":[{"id":str(m.id),"direction":m.direction,"role":m.role,"content":m.content,"created_at":m.created_at} for m in msgs]}
