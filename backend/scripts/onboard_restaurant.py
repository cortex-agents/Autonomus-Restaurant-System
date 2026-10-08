import argparse
import os
import asyncio
from datetime import time
from decimal import Decimal
from sqlalchemy import select
from app.db.models import Restaurant, MenuCategory, OwnerUser
from app.db.session import SessionLocal
from app.security import hash_password
from app.phone import normalize_phone


def parse_time(raw: str) -> time:
    parts = raw.split(":")
    if len(parts) != 2:
        raise ValueError("time must be HH:MM")
    return time(int(parts[0]), int(parts[1]))


async def onboard(args):
    if len(args.owner_password) < 8 or len(args.owner_password.encode()) > 72:
        raise SystemExit("Owner password must be 8-72 bytes")
    own_number = normalize_phone(args.whatsapp_number)
    owner_number = normalize_phone(args.owner_whatsapp_number)
    if not owner_number:
        raise SystemExit("--owner-whatsapp-number is required (the owner's PERSONAL number that receives order alerts)")
    if owner_number == own_number:
        raise SystemExit("owner WhatsApp number must differ from the restaurant's bot number")
    async with SessionLocal() as session:
        existing_phone = (await session.execute(
            select(Restaurant).where(Restaurant.whatsapp_number == own_number)
        )).scalar_one_or_none()
        if existing_phone:
            raise SystemExit(f"Restaurant with whatsapp_number {args.whatsapp_number} already exists")

        existing_instance = (await session.execute(
            select(Restaurant).where(Restaurant.phone_number_id == args.phone_number_id)
        )).scalar_one_or_none()
        if existing_instance:
            raise SystemExit(f"Restaurant with phone_number_id {args.phone_number_id} already exists")

        existing_owner = (await session.execute(
            select(OwnerUser).where(OwnerUser.email == args.owner_email.strip().lower())
        )).scalar_one_or_none()
        if existing_owner:
            raise SystemExit(f"Owner email {args.owner_email} already exists")

        restaurant = Restaurant(
            name=args.name.strip(),
            whatsapp_number=own_number,
            phone_number_id=args.phone_number_id.strip(),
            owner_whatsapp_number=owner_number,
            timezone=args.timezone,
            delivery_radius_km=Decimal(args.delivery_radius_km),
            delivery_fee=Decimal(args.delivery_fee),
            min_order_amount=Decimal(args.min_order_amount),
            opening_time=parse_time(args.opening_time),
            closing_time=parse_time(args.closing_time),
            brand_voice=args.brand_voice,
            is_active=True,
        )
        session.add(restaurant)
        await session.flush()

        owner = OwnerUser(
            restaurant_id=restaurant.id,
            email=args.owner_email.strip().lower(),
            password_hash=hash_password(args.owner_password),
            is_active=True,
        )
        session.add(owner)

        categories = [c.strip() for c in (args.categories or "").split(",") if c.strip()]
        for idx, name in enumerate(categories):
            session.add(MenuCategory(restaurant_id=restaurant.id, name=name, display_order=idx))

        await session.commit()
        print(f"Onboarded restaurant: {restaurant.id}")
        print(f"Owner email: {owner.email}")


def main():
    p = argparse.ArgumentParser(description="Onboard one restaurant with owner login and optional categories")
    p.add_argument("--name", required=True)
    p.add_argument("--whatsapp-number", required=True)
    p.add_argument("--phone-number-id", required=True, help="Meta phone_number_id or Evolution instance name")
    p.add_argument("--owner-email", required=True)
    p.add_argument("--owner-password", default=os.environ.get("OWNER_PASSWORD"), help="or set OWNER_PASSWORD env var (keeps it out of shell history)")
    p.add_argument("--owner-whatsapp-number", required=True)
    p.add_argument("--timezone", default="Asia/Karachi")
    p.add_argument("--delivery-radius-km", default="0")
    p.add_argument("--delivery-fee", default="0")
    p.add_argument("--min-order-amount", default="0")
    p.add_argument("--opening-time", default="12:00")
    p.add_argument("--closing-time", default="23:59")
    p.add_argument("--brand-voice", default="friendly, concise, Roman Urdu/English mix")
    p.add_argument("--categories", default="", help="Comma-separated categories, e.g. Burgers,Pizzas,BBQ")
    args = p.parse_args()
    if not args.owner_password:
        p.error("--owner-password or OWNER_PASSWORD env var is required")
    asyncio.run(onboard(args))


if __name__ == "__main__":
    main()
