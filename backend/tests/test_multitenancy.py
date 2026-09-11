import uuid
import pytest
from datetime import time
from sqlalchemy.exc import IntegrityError
from sqlalchemy import delete
from app.db.session import SessionLocal
from app.db.models import Restaurant, Customer


@pytest.mark.asyncio
async def test_same_phone_allowed_across_restaurants_but_not_within_one():
    suffix = uuid.uuid4().hex[:8]
    ids = []
    async with SessionLocal() as session:
        try:
            r1 = Restaurant(name=f"MT Test A {suffix}", whatsapp_number=f"+92 300 {suffix}1", phone_number_id=f"mt-{suffix}-1", opening_time=time(0,0), closing_time=time(23,59))
            r2 = Restaurant(name=f"MT Test B {suffix}", whatsapp_number=f"+92 300 {suffix}2", phone_number_id=f"mt-{suffix}-2", opening_time=time(0,0), closing_time=time(23,59))
            session.add_all([r1, r2]); await session.commit()
            ids = [r1.id, r2.id]

            phone = f"92300{suffix}"
            session.add(Customer(restaurant_id=r1.id, phone=phone))
            session.add(Customer(restaurant_id=r2.id, phone=phone))
            await session.commit()

            session.add(Customer(restaurant_id=r1.id, phone=phone))
            with pytest.raises(IntegrityError):
                await session.commit()
            await session.rollback()
        finally:
            if ids:
                await session.execute(delete(Customer).where(Customer.restaurant_id.in_(ids)))
                await session.execute(delete(Restaurant).where(Restaurant.id.in_(ids)))
                await session.commit()