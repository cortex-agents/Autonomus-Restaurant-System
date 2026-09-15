import uuid
import pytest
from datetime import time
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from app.main import app
from app.db.session import SessionLocal
from app.db.models import Restaurant, MenuItem
from app.security import create_access_token


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _headers(restaurant_id):
    return {"Authorization": f"Bearer {create_access_token(restaurant_id, subject='test@example.com')}"}


@pytest.mark.asyncio
async def test_partial_menu_update_does_not_wipe_other_fields():
    """Regression test: patching only the price must not blank out description/variants/addons."""
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r = Restaurant(name=f"Polish Test {suffix}", whatsapp_number=f"+92 300 {suffix}",
                       phone_number_id=f"pol-{suffix}", opening_time=time(0,0), closing_time=time(23,59))
        session.add(r); await session.flush()
        item = MenuItem(restaurant_id=r.id, name="Zinger Burger", base_price=Decimal("450"),
                        description="Crispy chicken fillet",
                        variants=[{"name": "Large", "price_delta": 150}],
                        addons=[{"name": "Extra Cheese", "price": 50}])
        session.add(item); await session.commit()
        try:
            async with _client() as client:
                resp = await client.patch(f"/api/menu/items/{item.id}",
                                          json={"base_price": "500"}, headers=_headers(r.id))
                assert resp.status_code == 200
                body = resp.json()
                assert body["base_price"] == 500.0
                # These must all survive a price-only update
                assert body["description"] == "Crispy chicken fillet"
                assert body["variants"] == [{"name": "Large", "price_delta": 150}]
                assert body["addons"] == [{"name": "Extra Cheese", "price": 50}]
                assert body["name"] == "Zinger Burger"
        finally:
            await session.execute(delete(MenuItem).where(MenuItem.restaurant_id == r.id))
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


@pytest.mark.asyncio
async def test_auth_me_returns_restaurant_identity():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r = Restaurant(name=f"Identity Test {suffix}", whatsapp_number=f"+92 301 {suffix}",
                       phone_number_id=f"idt-{suffix}", timezone="Asia/Karachi",
                       opening_time=time(0,0), closing_time=time(23,59))
        session.add(r); await session.commit()
        try:
            async with _client() as client:
                resp = await client.get("/api/auth/me", headers=_headers(r.id))
                assert resp.status_code == 200
                assert resp.json()["name"] == f"Identity Test {suffix}"
                assert resp.json()["timezone"] == "Asia/Karachi"

                unauthed = await client.get("/api/auth/me")
                assert unauthed.status_code == 401
        finally:
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


@pytest.mark.asyncio
async def test_settings_includes_restaurant_name():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r = Restaurant(name=f"Named Test {suffix}", whatsapp_number=f"+92 302 {suffix}",
                       phone_number_id=f"nam-{suffix}", opening_time=time(0,0), closing_time=time(23,59))
        session.add(r); await session.commit()
        try:
            async with _client() as client:
                resp = await client.get("/api/settings", headers=_headers(r.id))
                assert resp.status_code == 200
                assert resp.json()["name"] == f"Named Test {suffix}"
        finally:
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()


@pytest.mark.asyncio
async def test_orders_list_includes_total_count():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        r = Restaurant(name=f"Count Test {suffix}", whatsapp_number=f"+92 303 {suffix}",
                       phone_number_id=f"cnt-{suffix}", opening_time=time(0,0), closing_time=time(23,59))
        session.add(r); await session.commit()
        try:
            async with _client() as client:
                resp = await client.get("/api/orders", headers=_headers(r.id))
                assert resp.status_code == 200
                assert "total" in resp.json()   # pagination UI needs this
                assert resp.json()["total"] == 0
        finally:
            await session.execute(delete(Restaurant).where(Restaurant.id == r.id))
            await session.commit()