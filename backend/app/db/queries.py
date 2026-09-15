from sqlalchemy import select
from app.db.models import Customer, Conversation

async def get_customer(session, restaurant_id, phone):
    return (await session.execute(select(Customer).where(Customer.restaurant_id==restaurant_id, Customer.phone==phone))).scalar_one_or_none()

async def get_or_create_customer(session, restaurant_id, phone):
    c = await get_customer(session, restaurant_id, phone)
    if c: return c
    c=Customer(restaurant_id=restaurant_id, phone=phone)
    session.add(c); await session.flush(); return c

async def get_active_conversation(session, restaurant_id, customer_id):
    return (await session.execute(select(Conversation).where(Conversation.restaurant_id==restaurant_id, Conversation.customer_id==customer_id, Conversation.status.in_(["active","ordering","escalated"])).order_by(Conversation.started_at.desc()))).scalars().first()