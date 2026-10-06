import uuid
from datetime import time
from decimal import Decimal
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import delete

from app.main import app
from app.db.session import SessionLocal
from app.db.models import Restaurant, MenuCategory, Customer, Conversation, OwnerUser
from app.security import create_access_token, hash_password


def _headers(restaurant_id, email="owner@example.com"):
    token = create_access_token(restaurant_id, subject=email)
    return {"Authorization": f"Bearer {token}"}


async def _make_restaurant(session, suffix):
    r = Restaurant(
        name=f"Route Test {suffix}",
        whatsapp_number=f"+92 300 {suffix}",
        phone_number_id=f"route-{suffix}",
        timezone="Asia/Karachi",
        delivery_fee=Decimal("100"),
        min_order_amount=Decimal("0"),
        opening_time=time(0, 0),
        closing_time=time(23, 59),
    )
    session.add(r)
    await session.flush()
    return r


@pytest.mark.asyncio
async def test_menu_category_crud_and_scope():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r_a = await _make_restaurant(session, f"{suffix}a")
        r_b = await _make_restaurant(session, f"{suffix}b")
        await session.commit()
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                created = await client.post("/api/menu/categories", json={"name": "Burgers"}, headers=_headers(r_a.id))
                assert created.status_code == 200
                category_id = created.json()["id"]

                listed = await client.get("/api/menu/categories", headers=_headers(r_a.id))
                assert any(c["id"] == category_id for c in listed.json()["items"])

                forbidden = await client.patch(f"/api/menu/categories/{category_id}", json={"name": "Pizza"}, headers=_headers(r_b.id))
                assert forbidden.status_code == 404
        finally:
            await session.execute(delete(MenuCategory).where(MenuCategory.restaurant_id.in_([r_a.id, r_b.id])))
            await session.execute(delete(Restaurant).where(Restaurant.id.in_([r_a.id, r_b.id])))
            await session.commit()


@pytest.mark.asyncio
async def test_conversations_list_scoped():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r_a = await _make_restaurant(session, f"{suffix}a")
        r_b = await _make_restaurant(session, f"{suffix}b")
        c = Customer(restaurant_id=r_a.id, phone=f"9230{suffix}")
        session.add(c)
        await session.flush()
        conv = Conversation(restaurant_id=r_a.id, customer_id=c.id)
        session.add(conv)
        await session.commit()
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                a_list = await client.get("/api/conversations", headers=_headers(r_a.id))
                b_list = await client.get("/api/conversations", headers=_headers(r_b.id))
                assert any(x["id"] == str(conv.id) for x in a_list.json()["items"])
                assert all(x["id"] != str(conv.id) for x in b_list.json()["items"])
        finally:
            await session.execute(delete(Conversation).where(Conversation.id == conv.id))
            await session.execute(delete(Customer).where(Customer.id == c.id))
            await session.execute(delete(Restaurant).where(Restaurant.id.in_([r_a.id, r_b.id])))
            await session.commit()


@pytest.mark.asyncio
async def test_change_password_works_for_owner():
    suffix = uuid.uuid4().hex[:8]
    email = f"owner-{suffix}@example.com"
    async with SessionLocal() as session:
        r = await _make_restaurant(session, suffix)
        session.add(OwnerUser(restaurant_id=r.id, email=email, password_hash=hash_password("old-password"), is_active=True))
        await session.commit()
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                ok = await client.post(
                    "/api/auth/change-password",
                    json={"current_password": "old-password", "new_password": "new-password"},
                    headers=_headers(r.id, email=email),
                )
                assert ok.status_code == 200

                bad_old = await client.post(
                    "/api/auth/change-password",
                    json={"current_password": "old-password", "new_password": "wrong-password"},
                    headers=_headers(r.id, email=email),
                )
                assert bad_old.status_code == 401
        finally:
            await session.execute(delete(OwnerUser).where(OwnerUser.restaurant_id == r.id))
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


@pytest.mark.asyncio
async def test_database_owner_login_is_scoped_to_restaurant():
    suffix = uuid.uuid4().hex[:8]
    email = f"db-owner-{suffix}@example.com"
    async with SessionLocal() as session:
        r = await _make_restaurant(session, suffix)
        session.add(OwnerUser(
            restaurant_id=r.id,
            email=email,
            password_hash=hash_password("correct-password"),
            is_active=True,
        ))
        await session.commit()
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post(
                    "/api/auth/login",
                    json={"email": email, "password": "correct-password"},
                )
                assert response.status_code == 200
                token = response.json()["access_token"]
                me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
                assert me.status_code == 200
                assert me.json()["id"] == str(r.id)
                assert me.json()["whatsapp_number"] == r.whatsapp_number
        finally:
            await session.execute(delete(OwnerUser).where(OwnerUser.restaurant_id == r.id))
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()
