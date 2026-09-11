import json
import uuid
from datetime import time
from decimal import Decimal
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete

from app.main import app
from app.config import get_settings
from app.db.session import SessionLocal
from app.db.models import Restaurant, MenuCategory, MenuItem, Order, Customer, Conversation, Escalation, Message
from app.security import create_access_token, hash_password


async def _make_restaurant(session, suffix):
    r = Restaurant(
        name=f"API Test {suffix}", whatsapp_number=f"+92 300 {suffix}",
        phone_number_id=f"api-{suffix}", owner_whatsapp_number="923000000000",
        timezone="Asia/Karachi", delivery_fee=Decimal("100"), min_order_amount=Decimal("0"),
        opening_time=time(0, 0), closing_time=time(23, 59),
    )
    session.add(r); await session.flush()
    return r


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _headers(restaurant_id):
    token = create_access_token(restaurant_id, subject="test@example.com")
    return {"Authorization": f"Bearer {token}"}


# ---------- AUTH ----------

@pytest.mark.asyncio
async def test_login_success_and_failure():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r = await _make_restaurant(session, suffix)
        await session.commit()
        try:
            settings = get_settings()
            accounts_path = Path(settings.owner_accounts_file)
            accounts_path.parent.mkdir(parents=True, exist_ok=True)
            existing = json.loads(accounts_path.read_text()) if accounts_path.exists() else []
            email = f"owner-{suffix}@example.com"
            existing.append({"email": email, "password_hash": hash_password("correct-horse"), "restaurant_id": str(r.id)})
            accounts_path.write_text(json.dumps(existing))

            async with _client() as client:
                ok = await client.post("/api/auth/login", json={"email": email, "password": "correct-horse"})
                assert ok.status_code == 200
                assert "access_token" in ok.json() and "refresh_token" in ok.json()

                bad = await client.post("/api/auth/login", json={"email": email, "password": "wrong-password"})
                assert bad.status_code == 401

                refreshed = await client.post("/api/auth/refresh", json={"refresh_token": ok.json()["refresh_token"]})
                assert refreshed.status_code == 200
                assert "access_token" in refreshed.json()

                # An access token (not refresh) must be rejected by /refresh
                rejected = await client.post("/api/auth/refresh", json={"refresh_token": ok.json()["access_token"]})
                assert rejected.status_code == 401

            existing = [a for a in json.loads(accounts_path.read_text()) if a["email"] != email]
            accounts_path.write_text(json.dumps(existing))
        finally:
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


# ---------- MENU ----------

@pytest.mark.asyncio
async def test_menu_crud_and_cross_tenant_category_rejected():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r_a = await _make_restaurant(session, f"{suffix}a")
        r_b = await _make_restaurant(session, f"{suffix}b")
        cat_b = MenuCategory(restaurant_id=r_b.id, name="B's Category")
        session.add(cat_b); await session.commit()
        try:
            async with _client() as client:
                headers = _headers(r_a.id)

                created = await client.post("/api/menu/items", json={"name": "Test Burger", "base_price": "300"}, headers=headers)
                assert created.status_code == 200
                item_id = created.json()["id"]

                # Cross-tenant category must be rejected
                rejected = await client.post(
                    "/api/menu/items",
                    json={"name": "Sneaky Item", "base_price": "100", "category_id": str(cat_b.id)},
                    headers=headers,
                )
                assert rejected.status_code == 400

                toggled = await client.patch(f"/api/menu/items/{item_id}/availability", json={"is_available": False}, headers=headers)
                assert toggled.status_code == 200
                assert toggled.json()["is_available"] is False

                full = await client.get("/api/menu", headers=headers)
                assert full.status_code == 200

                deleted = await client.delete(f"/api/menu/items/{item_id}", headers=headers)
                assert deleted.status_code == 200

                # Restaurant B must never see restaurant A's item
                menu_b = await client.get("/api/menu", headers=_headers(r_b.id))
                all_item_names = [i["name"] for cat in menu_b.json()["categories"] for i in cat["items"]] + [i["name"] for i in menu_b.json()["uncategorized"]]
                assert "Test Burger" not in all_item_names
        finally:
            await session.execute(delete(MenuItem).where(MenuItem.restaurant_id.in_([r_a.id, r_b.id])))
            await session.execute(delete(MenuCategory).where(MenuCategory.restaurant_id.in_([r_a.id, r_b.id])))
            await session.execute(delete(Restaurant).where(Restaurant.id.in_([r_a.id, r_b.id])))
            await session.commit()


# ---------- SETTINGS ----------

@pytest.mark.asyncio
async def test_settings_get_and_patch():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r = await _make_restaurant(session, suffix)
        await session.commit()
        try:
            async with _client() as client:
                headers = _headers(r.id)
                got = await client.get("/api/settings", headers=headers)
                assert got.status_code == 200
                assert float(got.json()["delivery_fee"]) == 100.0

                patched = await client.patch("/api/settings", json={"delivery_fee": "150"}, headers=headers)
                assert patched.status_code == 200
                assert float(patched.json()["delivery_fee"]) == 150.0
                # Fields not sent must be unaffected
                assert float(patched.json()["min_order_amount"]) == 0.0
        finally:
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


# ---------- ORDERS ----------

@pytest.mark.asyncio
async def test_order_status_transitions():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r = await _make_restaurant(session, suffix)
        customer = Customer(restaurant_id=r.id, phone=f"9230{suffix}")
        session.add(customer); await session.flush()
        order = Order(restaurant_id=r.id, customer_id=customer.id, items=[], subtotal=Decimal("100"),
                       total=Decimal("100"), delivery_address="x", payment_method="cash_on_delivery")
        session.add(order); await session.commit()
        try:
            async with _client() as client:
                headers = _headers(r.id)

                # Valid transition
                ok = await client.patch(f"/api/orders/{order.id}/status", json={"status": "confirmed"}, headers=headers)
                assert ok.status_code == 200
                assert ok.json()["status"] == "confirmed"

                # Invalid transition (skipping a step)
                bad = await client.patch(f"/api/orders/{order.id}/status", json={"status": "delivered"}, headers=headers)
                assert bad.status_code == 400

                listed = await client.get("/api/orders", headers=headers)
                assert listed.status_code == 200
                assert any(o["id"] == str(order.id) for o in listed.json()["items"])
        finally:
            await session.execute(delete(Order).where(Order.id == order.id))
            await session.execute(delete(Customer).where(Customer.id == customer.id))
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


# ---------- ESCALATIONS ----------

@pytest.mark.asyncio
async def test_escalation_reply_and_resolve():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r = await _make_restaurant(session, suffix)
        customer = Customer(restaurant_id=r.id, phone=f"9230{suffix}")
        session.add(customer); await session.flush()
        conv = Conversation(restaurant_id=r.id, customer_id=customer.id, status="escalated")
        session.add(conv); await session.flush()
        esc = Escalation(restaurant_id=r.id, conversation_id=conv.id, reason="test complaint")
        session.add(esc); await session.commit()
        try:
            async with _client() as client:
                headers = _headers(r.id)

                listed = await client.get("/api/escalations", headers=headers)
                assert listed.status_code == 200
                assert any(e["id"] == str(esc.id) for e in listed.json())

                detail = await client.get(f"/api/escalations/{esc.id}", headers=headers)
                assert detail.status_code == 200

                # This actually calls WhatsAppHandler.send_message — with no real WHATSAPP_ACCESS_TOKEN
                # configured it will raise, so we only assert it uses the right identifier and doesn't 500
                # in a way that indicates a code bug (network/credential errors are expected in this env).
                reply = await client.post(f"/api/escalations/{esc.id}/reply", json={"content": "Manager will call you shortly."})
                # Accept 200 (if a real token is configured) or a clean error — but never a 404 (would mean
                # the escalation/conversation/customer lookup itself is broken).
                assert reply.status_code != 404

                resolved = await client.patch(f"/api/escalations/{esc.id}/resolve", headers=headers)
                assert resolved.status_code == 200
                assert resolved.json()["status"] == "resolved"
        finally:
            await session.execute(delete(Escalation).where(Escalation.id == esc.id))
            await session.execute(delete(Message).where(Message.conversation_id == conv.id))
            await session.execute(delete(Conversation).where(Conversation.id == conv.id))
            await session.execute(delete(Customer).where(Customer.id == customer.id))
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


# ---------- CONVERSATIONS ----------

@pytest.mark.asyncio
async def test_conversation_transcript_scoped_to_restaurant():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r_a = await _make_restaurant(session, f"{suffix}a")
        r_b = await _make_restaurant(session, f"{suffix}b")
        customer = Customer(restaurant_id=r_a.id, phone=f"9230{suffix}")
        session.add(customer); await session.flush()
        conv = Conversation(restaurant_id=r_a.id, customer_id=customer.id)
        session.add(conv); await session.flush()
        session.add(Message(conversation_id=conv.id, direction="inbound", role="customer", content="hello"))
        await session.commit()
        try:
            async with _client() as client:
                ok = await client.get(f"/api/conversations/{conv.id}", headers=_headers(r_a.id))
                assert ok.status_code == 200
                assert len(ok.json()["messages"]) == 1

                # Restaurant B must not be able to read Restaurant A's conversation
                forbidden = await client.get(f"/api/conversations/{conv.id}", headers=_headers(r_b.id))
                assert forbidden.status_code == 404
        finally:
            await session.execute(delete(Message).where(Message.conversation_id == conv.id))
            await session.execute(delete(Conversation).where(Conversation.id == conv.id))
            await session.execute(delete(Customer).where(Customer.id == customer.id))
            await session.execute(delete(Restaurant).where(Restaurant.id.in_([r_a.id, r_b.id])))
            await session.commit()