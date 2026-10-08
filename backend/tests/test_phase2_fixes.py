import uuid
from datetime import time
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import delete, select

from app.main import app
from app.phone import normalize_phone
from app.db.session import SessionLocal
from app.db.models import Restaurant, Customer, Conversation, Escalation, Message, Order, OwnerUser, MenuItem
from app.security import create_access_token, create_refresh_token, hash_password
from app.channels.evolution.handler import EvolutionHandler, EvolutionSendError


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _h(rid, email="o@example.com"):
    return {"Authorization": f"Bearer {create_access_token(rid, subject=email)}"}


async def _rest(session, sfx, **kw):
    r = Restaurant(name=f"P2 {sfx}", whatsapp_number=f"+92 300 {sfx}", phone_number_id=f"p2-{sfx}",
                   timezone="Asia/Karachi", delivery_fee=Decimal("0"), min_order_amount=Decimal("0"),
                   opening_time=time(0, 0), closing_time=time(23, 59), **kw)
    session.add(r); await session.flush(); return r


async def _purge(session, rid):
    cids = select(Conversation.id).where(Conversation.restaurant_id == rid)
    await session.execute(delete(Escalation).where(Escalation.restaurant_id == rid))
    await session.execute(delete(Message).where(Message.conversation_id.in_(cids)))
    await session.execute(delete(Order).where(Order.restaurant_id == rid))
    await session.execute(delete(Conversation).where(Conversation.restaurant_id == rid))
    await session.execute(delete(Customer).where(Customer.restaurant_id == rid))
    await session.execute(delete(MenuItem).where(MenuItem.restaurant_id == rid))
    await session.execute(delete(OwnerUser).where(OwnerUser.restaurant_id == rid))
    await session.execute(delete(Restaurant).where(Restaurant.id == rid))
    await session.commit()


def test_normalize_phone():
    assert normalize_phone("+92 300 1234567") == "923001234567"
    assert normalize_phone("0300-1234567") == "923001234567"
    assert normalize_phone("923001234567@s.whatsapp.net") == "923001234567"
    assert normalize_phone("") == ""


@pytest.mark.asyncio
async def test_evolution_handler_raises_on_http_error_and_normalizes():
    seen = {}

    async def fake_post(self, url, json=None, headers=None):
        seen["json"] = json
        return httpx.Response(500, text="boom", request=httpx.Request("POST", url))

    with patch.object(httpx.AsyncClient, "post", fake_post):
        with pytest.raises(EvolutionSendError):
            await EvolutionHandler().send_message("inst", "+92 300 1234567", "hi")
    assert seen["json"]["number"] == "923001234567"


@pytest.mark.asyncio
async def test_resolve_hands_conversation_back_to_bot():
    sfx = uuid.uuid4().hex[:8]
    async with SessionLocal() as s:
        r = await _rest(s, sfx)
        c = Customer(restaurant_id=r.id, phone=f"92{sfx}"); s.add(c); await s.flush()
        conv = Conversation(restaurant_id=r.id, customer_id=c.id, status="escalated", escalated_reason="x")
        s.add(conv); await s.flush()
        e = Escalation(restaurant_id=r.id, conversation_id=conv.id, reason="complaint"); s.add(e); await s.commit()
        try:
            async with _client() as cl:
                res = await cl.patch(f"/api/escalations/{e.id}/resolve", headers=_h(r.id))
                assert res.status_code == 200
            await s.refresh(conv)
            assert conv.status == "active" and conv.escalated_reason is None
        finally:
            await _purge(s, r.id)


@pytest.mark.asyncio
async def test_worker_ignores_deactivated_restaurant():
    from app.workers.message_processor import process_message
    sfx = uuid.uuid4().hex[:8]
    async with SessionLocal() as s:
        r = await _rest(s, sfx, is_active=False); await s.commit()
        try:
            with patch("app.workers.message_processor.get_channel") as gc:
                gc.return_value.send_message = AsyncMock()
                await process_message({"phone_number_id": r.phone_number_id, "from": "923001112222",
                                       "content": "menu", "whatsapp_message_id": "m1"})
                gc.return_value.send_message.assert_not_called()
            n = (await s.execute(select(Customer).where(Customer.restaurant_id == r.id))).scalars().all()
            assert n == []
        finally:
            await _purge(s, r.id)


@pytest.mark.asyncio
async def test_worker_dedupes_whatsapp_message_id():
    from app.workers.message_processor import process_message
    sfx = uuid.uuid4().hex[:8]
    async with SessionLocal() as s:
        r = await _rest(s, sfx); await s.commit()
        try:
            with patch("app.workers.message_processor.get_channel") as gc:
                gc.return_value.send_message = AsyncMock()
                p = {"phone_number_id": r.phone_number_id, "from": "+92 300 5551234", "content": "menu",
                     "whatsapp_message_id": f"dup-{sfx}"}
                await process_message(p); await process_message(p)
                assert gc.return_value.send_message.await_count == 1
                # destination was normalized
                assert gc.return_value.send_message.await_args.args[1] == "923005551234"
        finally:
            await _purge(s, r.id)


@pytest.mark.asyncio
async def test_analytics_excludes_cancelled_orders():
    sfx = uuid.uuid4().hex[:8]
    async with SessionLocal() as s:
        r = await _rest(s, sfx)
        c = Customer(restaurant_id=r.id, phone=f"92{sfx}"); s.add(c); await s.flush()
        for st, tot in (("delivered", 100), ("cancelled", 900)):
            s.add(Order(restaurant_id=r.id, customer_id=c.id, items=[{"name": "x", "qty": 1}], subtotal=tot,
                        delivery_fee=0, total=tot, status=st, delivery_address="a", payment_method="cash"))
        await s.commit()
        try:
            async with _client() as cl:
                res = await cl.get("/api/analytics/summary", headers=_h(r.id))
            body = res.json()
            assert body["orders_count"] == 1 and float(body["revenue"]) == 100
        finally:
            await _purge(s, r.id)


@pytest.mark.asyncio
async def test_refresh_rejected_for_deactivated_owner_and_long_password():
    sfx = uuid.uuid4().hex[:8]
    email = f"p2-{sfx}@example.com"
    async with SessionLocal() as s:
        r = await _rest(s, sfx)
        s.add(OwnerUser(restaurant_id=r.id, email=email, password_hash=hash_password("password123"), is_active=True))
        await s.commit()
        try:
            async with _client() as cl:
                tok = create_refresh_token(r.id, subject=email)
                assert (await cl.post("/api/auth/refresh", json={"refresh_token": tok})).status_code == 200
                res = await cl.post("/api/auth/change-password", headers=_h(r.id, email),
                                    json={"current_password": "password123", "new_password": "x" * 80})
                assert res.status_code == 422
                o = (await s.execute(select(OwnerUser).where(OwnerUser.email == email))).scalar_one()
                o.is_active = False; await s.commit()
                assert (await cl.post("/api/auth/refresh", json={"refresh_token": tok})).status_code == 401
        finally:
            await _purge(s, r.id)


@pytest.mark.asyncio
async def test_settings_timezone_validation_and_menu_variant_validation():
    sfx = uuid.uuid4().hex[:8]
    async with SessionLocal() as s:
        r = await _rest(s, sfx); await s.commit()
        try:
            async with _client() as cl:
                h = _h(r.id)
                assert (await cl.patch("/api/settings", headers=h, json={"timezone": "Mars/Base"})).status_code == 422
                ok = await cl.patch("/api/settings", headers=h, json={"timezone": "Asia/Karachi", "owner_whatsapp_number": "0300 5551111"})
                assert ok.status_code == 200 and ok.json()["owner_whatsapp_number"] == "923005551111"
                bad = await cl.post("/api/menu/items", headers=h, json={"name": "A", "base_price": 10, "variants": ["junk"]})
                assert bad.status_code == 422
                good = await cl.post("/api/menu/items", headers=h, json={"name": "A", "base_price": 10,
                                     "variants": [{"name": "L", "price_delta": 5}], "addons": [{"name": "Cheese", "price": 20}]})
                assert good.status_code == 200
        finally:
            await _purge(s, r.id)


def test_confirm_word_is_whole_word():
    from app.agent.service import _CONFIRM_RE
    assert not _CONFIRM_RE.search("1 basmati biryani")
    assert _CONFIRM_RE.search("bas itna")
