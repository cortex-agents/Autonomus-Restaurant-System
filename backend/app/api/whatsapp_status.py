from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.db.models import Conversation, Message
from app.db.session import get_db
from app.deps import get_current_restaurant

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp-status"])


@router.get("/status")
async def status(restaurant=Depends(get_current_restaurant), session: AsyncSession = Depends(get_db)):
    s = get_settings()
    last_inbound = (await session.execute(
        select(func.max(Message.created_at))
        .join(Conversation, Conversation.id == Message.conversation_id)
        .where(Conversation.restaurant_id == restaurant.id, Message.direction == "inbound")
    )).scalar_one()
    return {
        "active_channel": s.active_channel,
        "restaurant_id": str(restaurant.id),
        "restaurant_name": restaurant.name,
        "whatsapp_number": restaurant.whatsapp_number,
        "phone_number_id": restaurant.phone_number_id,
        "last_inbound_message_at": last_inbound,
    }
