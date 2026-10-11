import uuid
from datetime import time
from decimal import Decimal
from unittest.mock import patch, AsyncMock
import pytest
from sqlalchemy import delete, select
from app.db.session import SessionLocal
from app.db.models import Restaurant, MenuItem, MenuCategory, Customer, Conversation, Order, Message
import app.agent.service as svc
from app.agent.service import AgentService


async def _setup(session):
    sfx = uuid.uuid4().hex[:8]
    r = Restaurant(name=f"Conv {sfx}", whatsapp_number=f"9230{sfx}", phone_number_id=f"cv-{sfx}", timezone="Asia/Karachi",
                   delivery_fee=Decimal("100"), min_order_amount=Decimal("0"), opening_time=time(0, 0), closing_time=time(23, 59))
    session.add(r); await session.flush()
    burgers = MenuCategory(restaurant_id=r.id, name="Burgers", display_order=1)
    deals = MenuCategory(restaurant_id=r.id, name="Deals", display_order=2)
    session.add_all([burgers, deals]); await session.flush()
    for n, p, c in [("Beef Burger", 400, burgers), ("Zinger Burger", 700, burgers),
                    ("Zaiqa Deal 1 (1 Zinger + Fries + Drink)", 750, deals), ("Family Deal (4 Broast pcs + 2 Zinger)", 2200, deals)]:
        session.add(MenuItem(restaurant_id=r.id, name=n, base_price=Decimal(p), category_id=c.id))
    cust = Customer(restaurant_id=r.id, phone=f"92{sfx}"); session.add(cust); await session.flush()
    conv = Conversation(restaurant_id=r.id, customer_id=cust.id); session.add(conv); await session.commit()
    return r, cust, conv


async def _purge(session, rid):
    await session.execute(delete(Order).where(Order.restaurant_id == rid))
    cids = select(Conversation.id).where(Conversation.restaurant_id == rid)
    await session.execute(delete(Message).where(Message.conversation_id.in_(cids)))
    await session.execute(delete(Conversation).where(Conversation.restaurant_id == rid))
    await session.execute(delete(Customer).where(Customer.restaurant_id == rid))
    await session.execute(delete(MenuItem).where(MenuItem.restaurant_id == rid))
    await session.execute(delete(MenuCategory).where(MenuCategory.restaurant_id == rid))
    await session.execute(delete(Restaurant).where(Restaurant.id == rid))
    await session.commit()


@pytest.mark.asyncio
async def test_real_chat_that_failed_before_now_works():
    async with SessionLocal() as s:
        r, c, conv = await _setup(s)
        try:
            a = AgentService(s, r, c, conv)
            assert "Zinger Burger" in await a.handle("menu")
            only = await a.handle("mujhay sirf burgers dikhaoo")
            assert "Burger" in only and "Deal" not in only
            only2 = await a.handle("mujhay sirf burger kay baray main btaooo")
            assert "Deal" not in only2
            add = await a.handle("zaiqa deal 1 chahiye")
            assert "1x Zaiqa Deal 1" in add and "750" in add
            assert "address" in (await a.handle("bas")).lower()
            await a.handle("DHA Phase 6, Karachi")
            assert "Order confirm" in await a.handle("cash on delivery")
        finally:
            await _purge(s, r.id)


@pytest.mark.asyncio
async def test_llm_quota_error_trips_circuit_breaker_once():
    class QuotaErr(Exception):
        status_code = 429
    async with SessionLocal() as s:
        r, c, conv = await _setup(s)
        try:
            calls = AsyncMock(side_effect=QuotaErr("insufficient_quota"))
            with patch.object(svc.AgentService, "_handle_with_agents_sdk", calls), \
                 patch("app.config.get_settings") as gs:
                gs.return_value.openai_api_key = "sk-test"
                svc._LLM_DISABLED_UNTIL = 0.0
                a = AgentService(s, r, c, conv)
                await a.handle("menu"); await a.handle("menu")
                assert calls.await_count == 1  # second message skipped the dead LLM
        finally:
            svc._LLM_DISABLED_UNTIL = 0.0
            await _purge(s, r.id)
