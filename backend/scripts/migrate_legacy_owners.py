import argparse
import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from app.config import get_settings
from app.db.models import OwnerUser, Restaurant
from app.db.session import SessionLocal


async def migrate(path: Path) -> tuple[int, int]:
    if not path.exists():
        raise SystemExit(f"Legacy owner file not found: {path}")
    try:
        rows = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Could not read legacy owner file: {exc}") from exc
    if not isinstance(rows, list):
        raise SystemExit("Legacy owner file must contain a JSON list")

    migrated = 0
    skipped = 0
    async with SessionLocal() as session:
        for row in rows:
            email = str(row.get("email", "")).strip().lower()
            restaurant_id = str(row.get("restaurant_id", "")).strip()
            password_hash = row.get("password_hash")
            if not email or not restaurant_id or not password_hash:
                raise SystemExit("Every legacy owner must contain email, restaurant_id, and password_hash")

            restaurant = (await session.execute(
                select(Restaurant).where(Restaurant.id == restaurant_id)
            )).scalar_one_or_none()
            if not restaurant:
                raise SystemExit(f"Restaurant not found for legacy owner {email}: {restaurant_id}")

            by_email = (await session.execute(
                select(OwnerUser).where(OwnerUser.email == email)
            )).scalar_one_or_none()
            if by_email:
                if by_email.restaurant_id != restaurant.id:
                    raise SystemExit(f"Email belongs to a different restaurant: {email}")
                skipped += 1
                continue

            by_restaurant = (await session.execute(
                select(OwnerUser).where(OwnerUser.restaurant_id == restaurant.id)
            )).scalar_one_or_none()
            if by_restaurant:
                raise SystemExit(f"Restaurant already has an owner account: {restaurant.id}")

            session.add(OwnerUser(
                restaurant_id=restaurant.id,
                email=email,
                password_hash=password_hash,
                is_active=True,
            ))
            migrated += 1

        await session.commit()
    return migrated, skipped


def main():
    parser = argparse.ArgumentParser(description="Migrate owner_accounts.json records into owner_users")
    parser.add_argument("--file", default=get_settings().owner_accounts_file)
    args = parser.parse_args()
    migrated, skipped = asyncio.run(migrate(Path(args.file)))
    print(f"Migrated {migrated} owner account(s); skipped {skipped} already migrated account(s).")


if __name__ == "__main__":
    main()
