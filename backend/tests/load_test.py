"""
Load test for Section 13 target: 5 restaurants, 50 concurrent conversations,
webhook-to-reply latency P95 under 5 seconds.

Does NOT need real WhatsApp/OpenAI credentials — measures the time from
webhook POST to the agent's reply being persisted in the `messages` table
(the outbound WhatsApp send itself is best-effort and failure there doesn't
block this measurement, matching how message_processor.py already treats it).

Run with: docker compose exec api python tests/load_test.py
"""
import asyncio
import time
import uuid
from datetime import time as dtime
from decimal import Decimal

from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete

from app.main import app
from app.db.session import SessionLocal
from app.db.models import Restaurant, MenuItem, Customer, Conversation, Message

NUM_RESTAURANTS = 5
CONVERSATIONS_PER_RESTAURANT = 10  # 5 x 10 = 50 concurrent conversations
TARGET_P95_SECONDS = 5.0
POLL_TIMEOUT_SECONDS = 15
POLL_INTERVAL_SECONDS = 0.2


async def _setup_restaurants(session, suffix):
    restaurants = []
    for i in range(NUM_RESTAURANTS):
        r = Restaurant(
            name=f"Load Test Restaurant {suffix}-{i}",
            whatsapp_number=f"+92 300 {suffix}{i}",
            phone_number_id=f"load-{suffix}-{i}",
            timezone="Asia/Karachi", delivery_fee=Decimal("0"), min_order_amount=Decimal("0"),
            opening_time=dtime(0, 0), closing_time=dtime(23, 59),
        )
        session.add(r); await session.flush()
        session.add(MenuItem(restaurant_id=r.id, name="Test Item", base_price=Decimal("100")))
        restaurants.append(r)
    await session.commit()
    return restaurants


async def _send_and_measure(client, restaurant, index):
    from_number = f"92300{restaurant.phone_number_id[-6:]}{index:03d}"
    payload = {
        "entry": [{"changes": [{"value": {
            "metadata": {"phone_number_id": restaurant.phone_number_id},
            "messages": [{"from": from_number, "id": f"loadtest-{restaurant.id}-{index}",
                          "text": {"body": "1 test item"}, "timestamp": str(int(time.time()))}],
        }}]}]
    }
    start = time.monotonic()
    resp = await client.post("/webhooks/whatsapp", json=payload)
    if resp.status_code != 200:
        return None, from_number

    # Poll the DB for the agent's reply to land (proxy for "webhook-to-reply latency")
    deadline = start + POLL_TIMEOUT_SECONDS
    async with SessionLocal() as poll_session:
        while time.monotonic() < deadline:
            customer = (await poll_session.execute(
                select(Customer).where(Customer.restaurant_id == restaurant.id, Customer.phone == from_number)
            )).scalar_one_or_none()
            if customer:
                conv = (await poll_session.execute(
                    select(Conversation).where(Conversation.customer_id == customer.id)
                )).scalar_one_or_none()
                if conv:
                    reply = (await poll_session.execute(
                        select(Message).where(Message.conversation_id == conv.id, Message.role == "agent")
                    )).scalar_one_or_none()
                    if reply:
                        return time.monotonic() - start, from_number
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
    return None, from_number  # timed out


async def main():
    suffix = uuid.uuid4().hex[:6]
    async with SessionLocal() as session:
        restaurants = await _setup_restaurants(session, suffix)

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            tasks = [
                _send_and_measure(client, r, i)
                for r in restaurants
                for i in range(CONVERSATIONS_PER_RESTAURANT)
            ]
            print(f"Firing {len(tasks)} concurrent conversations across {NUM_RESTAURANTS} restaurants...")
            results = await asyncio.gather(*tasks)

        latencies = sorted(lat for lat, _ in results if lat is not None)
        timed_out = [phone for lat, phone in results if lat is None]

        print(f"\nCompleted: {len(latencies)}/{len(tasks)} (timed out: {len(timed_out)})")
        if latencies:
            p50 = latencies[len(latencies) // 2]
            p95 = latencies[int(len(latencies) * 0.95) - 1] if len(latencies) > 1 else latencies[0]
            print(f"P50 latency: {p50:.2f}s")
            print(f"P95 latency: {p95:.2f}s (target: <{TARGET_P95_SECONDS}s)")
            print("PASS" if p95 < TARGET_P95_SECONDS else "FAIL — P95 exceeds target")
        if timed_out:
            print(f"WARNING: {len(timed_out)} conversations never got a reply within {POLL_TIMEOUT_SECONDS}s")
    finally:
        async with SessionLocal() as session:
            rids = [r.id for r in restaurants]
            await session.execute(delete(Message).where(Message.conversation_id.in_(
                select(Conversation.id).where(Conversation.restaurant_id.in_(rids))
            )))
            await session.execute(delete(Conversation).where(Conversation.restaurant_id.in_(rids)))
            await session.execute(delete(Customer).where(Customer.restaurant_id.in_(rids)))
            await session.execute(delete(MenuItem).where(MenuItem.restaurant_id.in_(rids)))
            await session.execute(delete(Restaurant).where(Restaurant.id.in_(rids)))
            await session.commit()
            print("Cleaned up test data.")


if __name__ == "__main__":
    asyncio.run(main())