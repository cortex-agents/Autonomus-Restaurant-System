import uuid
import pytest
from datetime import time
from decimal import Decimal
from sqlalchemy import select, delete
from app.db.session import SessionLocal
from app.db.models import Restaurant, MenuItem, Customer, Conversation, Order, Escalation
from app.agent.service import AgentService


@pytest.mark.asyncio
async def test_full_order_flow_browse_to_finalize():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        try:
            r = Restaurant(name=f"Order Flow Test {suffix}", whatsapp_number=f"+92 300 {suffix}1",
                phone_number_id=f"of-{suffix}1", timezone="Asia/Karachi", delivery_fee=Decimal("100"),
                min_order_amount=Decimal("0"), opening_time=time(0, 0), closing_time=time(23, 59))
            session.add(r); await session.flush()
            item = MenuItem(restaurant_id=r.id, name="Zinger Burger", base_price=Decimal("450"))
            session.add(item); await session.flush()
            customer = Customer(restaurant_id=r.id, phone=f"9230{suffix}1")
            session.add(customer); await session.flush()
            conv = Conversation(restaurant_id=r.id, customer_id=customer.id)
            session.add(conv); await session.flush()
            await session.commit()

            service = AgentService(session, r, customer, conv)

            reply1 = await service.handle("2 zinger burger")
            assert "cart mein add" in reply1
            assert conv.order_stage == "ordering"

            reply2 = await service.handle("bas confirm karo")
            assert "address" in reply2.lower()
            assert conv.order_stage == "awaiting_address"

            await service.handle("House 1 Test Street")
            assert conv.order_stage == "awaiting_payment"

            reply4 = await service.handle("cash")
            assert "Order confirm" in reply4
            assert conv.order_stage == "complete"
            await session.commit()

            orders = (await session.execute(select(Order).where(Order.restaurant_id == r.id))).scalars().all()
            assert len(orders) == 1
            assert orders[0].delivery_address == "House 1 Test Street"
            assert orders[0].payment_method == "cash_on_delivery"
            assert float(orders[0].total) == 1000.0
        finally:
            await session.execute(delete(Order).where(Order.restaurant_id == r.id))
            await session.execute(delete(Conversation).where(Conversation.restaurant_id == r.id))
            await session.execute(delete(Customer).where(Customer.restaurant_id == r.id))
            await session.execute(delete(MenuItem).where(MenuItem.restaurant_id == r.id))
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


@pytest.mark.asyncio
async def test_order_below_minimum_not_finalized():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        try:
            r = Restaurant(name=f"Min Order Test {suffix}", whatsapp_number=f"+92 300 {suffix}2",
                phone_number_id=f"of-{suffix}2", timezone="Asia/Karachi", delivery_fee=Decimal("0"),
                min_order_amount=Decimal("500"), opening_time=time(0, 0), closing_time=time(23, 59))
            session.add(r); await session.flush()
            item = MenuItem(restaurant_id=r.id, name="Coke", base_price=Decimal("100"))
            session.add(item); await session.flush()
            customer = Customer(restaurant_id=r.id, phone=f"9230{suffix}2")
            session.add(customer); await session.flush()
            conv = Conversation(restaurant_id=r.id, customer_id=customer.id)
            session.add(conv); await session.flush()
            await session.commit()

            service = AgentService(session, r, customer, conv)
            await service.handle("1 coke")
            reply = await service.handle("bas confirm karo")
            assert "minimum" in reply.lower()
            assert conv.order_stage != "awaiting_address"
        finally:
            await session.execute(delete(Conversation).where(Conversation.restaurant_id == r.id))
            await session.execute(delete(Customer).where(Customer.restaurant_id == r.id))
            await session.execute(delete(MenuItem).where(MenuItem.restaurant_id == r.id))
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


@pytest.mark.asyncio
async def test_restaurant_closed_blocks_ordering():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        try:
            r = Restaurant(name=f"Closed Test {suffix}", whatsapp_number=f"+92 300 {suffix}3",
                phone_number_id=f"of-{suffix}3", timezone="Asia/Karachi",
                opening_time=time(9, 0), closing_time=time(9, 1))
            session.add(r); await session.flush()
            customer = Customer(restaurant_id=r.id, phone=f"9230{suffix}3")
            session.add(customer); await session.flush()
            conv = Conversation(restaurant_id=r.id, customer_id=customer.id)
            session.add(conv); await session.flush()
            await session.commit()

            service = AgentService(session, r, customer, conv)
            reply = await service.handle("order lena hai")
            assert "closed" in reply.lower()
        finally:
            await session.execute(delete(Conversation).where(Conversation.restaurant_id == r.id))
            await session.execute(delete(Customer).where(Customer.restaurant_id == r.id))
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


@pytest.mark.asyncio
async def test_escalation_trigger_creates_record():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        try:
            r = Restaurant(name=f"Escalation Test {suffix}", whatsapp_number=f"+92 300 {suffix}4",
                phone_number_id=f"of-{suffix}4", owner_whatsapp_number="923000000000",
                timezone="Asia/Karachi", opening_time=time(0, 0), closing_time=time(23, 59))
            session.add(r); await session.flush()
            customer = Customer(restaurant_id=r.id, phone=f"9230{suffix}4")
            session.add(customer); await session.flush()
            conv = Conversation(restaurant_id=r.id, customer_id=customer.id)
            session.add(conv); await session.flush()
            await session.commit()

            service = AgentService(session, r, customer, conv)
            reply = await service.handle("mujhe refund chahiye")
            assert "human" in reply.lower() or "forward" in reply.lower()
            assert conv.status == "escalated"

            escs = (await session.execute(select(Escalation).where(Escalation.restaurant_id == r.id))).scalars().all()
            assert len(escs) == 1
        finally:
            await session.execute(delete(Escalation).where(Escalation.restaurant_id == r.id))
            await session.execute(delete(Conversation).where(Conversation.restaurant_id == r.id))
            await session.execute(delete(Customer).where(Customer.restaurant_id == r.id))
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()