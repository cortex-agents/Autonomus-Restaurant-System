import argparse
import asyncio
from uuid import UUID
from sqlalchemy import select
from app.db.models import OwnerUser, Restaurant
from app.db.session import SessionLocal
from app.security import hash_password


async def upsert_owner(email: str, password: str, restaurant_id: str):
    normalized = email.strip().lower()
    if len(password) < 8:
        raise SystemExit("Password must be at least 8 characters")
    rid = UUID(restaurant_id)
    async with SessionLocal() as session:
        restaurant = (await session.execute(select(Restaurant).where(Restaurant.id == rid))).scalar_one_or_none()
        if not restaurant:
            raise SystemExit(f"Restaurant not found: {restaurant_id}")

        existing = (await session.execute(select(OwnerUser).where(OwnerUser.email == normalized))).scalar_one_or_none()
        if existing and existing.restaurant_id != rid:
            raise SystemExit(f"Email {normalized} already belongs to another restaurant")

        owner_for_restaurant = (await session.execute(
            select(OwnerUser).where(OwnerUser.restaurant_id == rid)
        )).scalar_one_or_none()

        if existing:
            existing.password_hash = hash_password(password)
            existing.is_active = True
            action = "updated"
        elif owner_for_restaurant:
            owner_for_restaurant.email = normalized
            owner_for_restaurant.password_hash = hash_password(password)
            owner_for_restaurant.is_active = True
            action = "replaced"
        else:
            session.add(OwnerUser(restaurant_id=rid, email=normalized, password_hash=hash_password(password), is_active=True))
            action = "created"

        await session.commit()
        print(f"Owner {action}: {normalized} for restaurant {restaurant_id}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--restaurant-id", required=True)
    a = p.parse_args()
    asyncio.run(upsert_owner(a.email, a.password, a.restaurant_id))


if __name__ == "__main__":
    main()
