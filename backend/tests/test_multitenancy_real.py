import uuid
from datetime import time
from decimal import Decimal
import pytest
from sqlalchemy import select, delete
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import SessionLocal
from app.db.models import Restaurant, MenuItem, Customer, Order
from app.security import create_access_token


async def _make_restaurant(session, suffix, price):
    r = Restaurant(
        name=f"Isolation Test {suffix}", whatsapp_number=f"+92 300 {suffix}",
        phone_number_id=f"iso-{suffix}", timezone="Asia/Karachi",
        delivery_fee=Decimal("0"), min_order_amount=Decimal("0"),
        opening_time=time(0, 0), closing_time=time(23, 59),
    )
    session.add(r); await session.flush()
    item = MenuItem(restaurant_id=r.id, name="Shared Item Name", base_price=Decimal(str(price)))
    session.add(item); await session.flush()
    return r, item


@pytest.mark.asyncio
async def test_same_item_name_different_price_never_leaks():
    suffix = uuid.uuid4().hex[:8]
    r_a = r_b = None
    async with SessionLocal() as session:
        try:
            r_a, item_a = await _make_restaurant(session, f"{suffix}a", 100)
            r_b, item_b = await _make_restaurant(session, f"{suffix}b", 999)
            await session.commit()

            rows_a = (await session.execute(
                select(MenuItem).where(MenuItem.restaurant_id == r_a.id, MenuItem.name == "Shared Item Name")
            )).scalars().all()

            assert len(rows_a) == 1
            assert float(rows_a[0].base_price) == 100
            assert rows_a[0].restaurant_id != r_b.id
        finally:
            if r_a and r_b:
                await session.execute(delete(MenuItem).where(MenuItem.restaurant_id.in_([r_a.id, r_b.id])))
                await session.execute(delete(Restaurant).where(Restaurant.id.in_([r_a.id, r_b.id])))
                await session.commit()


@pytest.mark.asyncio
async def test_same_phone_number_two_restaurants_no_crosstalk():
    suffix = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        try:
            r_a, _ = await _make_restaurant(session, f"{suffix}c", 50)
            r_b, _ = await _make_restaurant(session, f"{suffix}d", 50)
            await session.commit()

            phone = f"9230{suffix}"
            cust_a = Customer(restaurant_id=r_a.id, phone=phone, saved_address="Address A")
            cust_b = Customer(restaurant_id=r_b.id, phone=phone, saved_address="Address B")
            session.add_all([cust_a, cust_b]); await session.commit()

            assert cust_a.id != cust_b.id
            assert cust_a.restaurant_id != cust_b.restaurant_id

            order_a = Order(restaurant_id=r_a.id, customer_id=cust_a.id, items=[], subtotal=Decimal("0"), total=Decimal("0"), delivery_address="x", payment_method="cash_on_delivery")
            session.add(order_a); await session.commit()

            orders_for_b = (await session.execute(select(Order).where(Order.restaurant_id == r_b.id))).scalars().all()
            assert all(o.id != order_a.id for o in orders_for_b)
        finally:
            await session.execute(delete(Order).where(Order.restaurant_id.in_([r_a.id, r_b.id])))
            await session.execute(delete(Customer).where(Customer.restaurant_id.in_([r_a.id, r_b.id])))
            await session.execute(delete(MenuItem).where(MenuItem.restaurant_id.in_([r_a.id, r_b.id])))
            await session.execute(delete(Restaurant).where(Restaurant.id.in_([r_a.id, r_b.id])))
            await session.commit()


@pytest.mark.asyncio
async def test_jwt_for_fabricated_restaurant_cannot_read_orders():
    fake_restaurant_id = uuid.uuid4()
    token = create_access_token(fake_restaurant_id, subject="test@example.com")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/orders", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401