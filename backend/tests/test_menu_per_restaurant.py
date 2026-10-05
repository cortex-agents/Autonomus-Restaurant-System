"""Each restaurant has its own menu; WhatsApp "menu" must only ever show the menu of the
restaurant whose number received the message."""
import uuid
from datetime import time
from decimal import Decimal
from types import SimpleNamespace
import pytest
from sqlalchemy import delete, select

from app.agent.menu_format import filter_groups, format_menu
from app.db.models import (Conversation, Customer, MenuCategory, MenuItem, Message, Restaurant)
from app.db.session import SessionLocal
from app.workers import message_processor


def item(name, price, variants=None):
    return SimpleNamespace(name=name, base_price=Decimal(str(price)), variants=variants or [])


# ---------- pure formatter ----------

def test_format_menu_groups_by_category_with_restaurant_name():
    text = format_menu("Smoke House BBQ", [("Grill", [item("Seekh Kebab", 600)]), ("Sides", [item("Naan", 40)])])
    assert "Smoke House BBQ" in text and "*Grill*" in text and "*Sides*" in text
    assert "Seekh Kebab — PKR 600" in text and "Naan — PKR 40" in text


def test_format_menu_shows_sizes_and_skips_empty_categories():
    text = format_menu("X", [("Pizzas", [item("Fajita", 900, [{"name": "Medium", "price_delta": 0}, {"name": "Large", "price_delta": 400}])]), ("Empty", [])])
    assert "Medium / Large (+400)" in text and "Empty" not in text


def test_format_menu_empty():
    assert format_menu("X", [("Empty", [])]) == "Abhi menu available nahi hai."


def test_format_menu_stays_under_whatsapp_limit_and_says_how_to_see_more():
    groups = [(f"Cat{c}", [item(f"Item {c}-{i}", 100 + i) for i in range(40)]) for c in range(10)]
    text = format_menu("Big Place", groups)
    assert len(text) <= 4096 and "menu <category ka naam>" in text


def test_filter_groups_by_category_name():
    groups = [("Burgers", [item("Zinger", 450)]), ("Pizzas", [item("Fajita", 900)])]
    assert [n for n, _ in filter_groups(groups, "menu burgers")] == ["Burgers"]
    assert [n for n, _ in filter_groups(groups, "pizza menu")] == ["Pizzas"]
    assert [n for n, _ in filter_groups(groups, "menu")] == ["Burgers", "Pizzas"]
    assert [n for n, _ in filter_groups(groups, "menu desserts")] == ["Burgers", "Pizzas"]  # unknown -> full menu


# ---------- end to end: webhook payload -> resolved restaurant -> reply ----------

async def _seed(session, tag, cat, items, unavailable=()):
    r = Restaurant(name=f"{tag} Kitchen", whatsapp_number=f"+92{uuid.uuid4().int % 10**10}",
                   phone_number_id=f"pnid-{uuid.uuid4().hex[:10]}", timezone="Asia/Karachi",
                   opening_time=time(0, 0), closing_time=time(23, 59))
    session.add(r); await session.flush()
    c = MenuCategory(restaurant_id=r.id, name=cat); session.add(c); await session.flush()
    for name, price in items:
        session.add(MenuItem(restaurant_id=r.id, category_id=c.id, name=name, base_price=Decimal(price),
                             is_available=name not in unavailable))
    return r


async def _cleanup(ids):
    async with SessionLocal() as s:
        convs = (await s.execute(select(Conversation.id).where(Conversation.restaurant_id.in_(ids)))).scalars().all()
        if convs:
            await s.execute(delete(Message).where(Message.conversation_id.in_(convs)))
        await s.execute(delete(Conversation).where(Conversation.restaurant_id.in_(ids)))
        await s.execute(delete(Customer).where(Customer.restaurant_id.in_(ids)))
        await s.execute(delete(MenuItem).where(MenuItem.restaurant_id.in_(ids)))
        await s.execute(delete(MenuCategory).where(MenuCategory.restaurant_id.in_(ids)))
        await s.execute(delete(Restaurant).where(Restaurant.id.in_(ids)))
        await s.commit()


@pytest.mark.asyncio
async def test_whatsapp_menu_shows_only_the_receiving_restaurants_menu(monkeypatch):
    sent = []

    class FakeChannel:
        async def send_message(self, instance, to, body):
            sent.append((instance, to, body))

    monkeypatch.setattr(message_processor, "get_channel", lambda: FakeChannel())
    async with SessionLocal() as s:
        a = await _seed(s, "FastFood", "Burgers", [("Zinger Burger", "450"), ("Secret Special", "999")], unavailable=("Secret Special",))
        b = await _seed(s, "Pizzeria", "Pizzas", [("Fajita Pizza", "1200")])
        c = await _seed(s, "BBQ", "Grill", [("Seekh Kebab", "700")])
        await s.commit()
        a_id, b_id, c_id, a_pn, b_pn, c_pn = a.id, b.id, c.id, a.phone_number_id, b.phone_number_id, c.phone_number_id
    try:
        same_customer = "923001234567"  # the SAME person messages all three restaurants
        for pn in (a_pn, b_pn, c_pn):
            await message_processor.process_message({"phone_number_id": pn, "from": same_customer, "content": "menu", "whatsapp_message_id": uuid.uuid4().hex})
        by_instance = {inst: body for inst, _to, body in sent}

        a_text, b_text, c_text = by_instance[a_pn], by_instance[b_pn], by_instance[c_pn]
        assert "FastFood Kitchen" in a_text and "Zinger Burger" in a_text and "Burgers" in a_text
        assert "Secret Special" not in a_text  # unavailable items are hidden too
        assert "Fajita" not in a_text and "Seekh" not in a_text and "Pizzeria" not in a_text and "BBQ" not in a_text

        assert "Pizzeria Kitchen" in b_text and "Fajita Pizza" in b_text
        assert "Zinger" not in b_text and "Seekh" not in b_text and "FastFood" not in b_text

        assert "BBQ Kitchen" in c_text and "Seekh Kebab" in c_text
        assert "Zinger" not in c_text and "Fajita" not in c_text
    finally:
        await _cleanup([a_id, b_id, c_id])


@pytest.mark.asyncio
async def test_unknown_number_gets_no_menu_and_no_reply(monkeypatch):
    sent = []

    class FakeChannel:
        async def send_message(self, *a):
            sent.append(a)

    monkeypatch.setattr(message_processor, "get_channel", lambda: FakeChannel())
    await message_processor.process_message({"phone_number_id": "does-not-exist", "from": "923000000000", "content": "menu"})
    assert sent == []
