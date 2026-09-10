from uuid import UUID
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Restaurant, Customer, Conversation, MenuItem, Order, Message, Escalation

async def get_restaurant_by_whatsapp_number(session, whatsapp_number):
    return (await session.execute(select(Restaurant).where(Restaurant.whatsapp_number == whatsapp_number))).scalar_one_or_none()

async def get_customer(session, restaurant_id, phone):
    return (await session.execute(select(Customer).where(Customer.restaurant_id==restaurant_id, Customer.phone==phone))).scalar_one_or_none()

async def get_or_create_customer(session, restaurant_id, phone):
    c = await get_customer(session, restaurant_id, phone)
    if c: return c
    c=Customer(restaurant_id=restaurant_id, phone=phone)
    session.add(c); await session.flush(); return c

async def get_active_conversation(session, restaurant_id, customer_id):
    return (await session.execute(select(Conversation).where(Conversation.restaurant_id==restaurant_id, Conversation.customer_id==customer_id, Conversation.status.in_(["active","ordering","escalated"])).order_by(Conversation.started_at.desc()))).scalars().first()

async def get_or_create_conversation(session, restaurant_id, customer_id):
    c=await get_active_conversation(session,restaurant_id,customer_id)
    if c:return c
    c=Conversation(restaurant_id=restaurant_id,customer_id=customer_id)
    session.add(c); await session.flush(); return c

async def menu_search(session, restaurant_id, query):
    return (await session.execute(select(MenuItem).where(MenuItem.restaurant_id==restaurant_id, MenuItem.is_available.is_(True), MenuItem.name.ilike(f"%{query}%")))).scalars().all()

async def menu_item(session, restaurant_id, item_id):
    return (await session.execute(select(MenuItem).where(MenuItem.restaurant_id==restaurant_id, MenuItem.id==item_id))).scalar_one_or_none()
