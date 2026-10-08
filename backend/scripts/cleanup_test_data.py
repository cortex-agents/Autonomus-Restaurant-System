"""Delete test/demo restaurants and ALL their data. DRY-RUN by default.

  python scripts/cleanup_test_data.py                       # lists what WOULD be deleted
  python scripts/cleanup_test_data.py --apply               # actually deletes
  python scripts/cleanup_test_data.py --keep "Zaiqa Broast & Grill" --apply

Restaurants that have an owner login (owner_users) are always kept unless --include-owned.
"""
import argparse
import asyncio
import re
from sqlalchemy import select, delete
from app.db.session import SessionLocal
from app.db.models import (Restaurant, OwnerUser, MenuItem, MenuCategory, Message, Conversation,
                           Order, Escalation, Customer)

TEST_PAT = re.compile(r"(demo|test|isolation)", re.I)


async def main(args):
    async with SessionLocal() as s:
        rows = (await s.execute(select(Restaurant))).scalars().all()
        owned = {r for (r,) in (await s.execute(select(OwnerUser.restaurant_id))).all()}
        targets = []
        for r in rows:
            if r.name in args.keep:
                continue
            if r.id in owned and not args.include_owned:
                continue
            if TEST_PAT.search(r.name or "") or TEST_PAT.search(r.phone_number_id or ""):
                targets.append(r)
        if not targets:
            print("Nothing to delete."); return
        for r in targets:
            print(f"{'DELETE' if args.apply else 'would delete'}: {r.name} ({r.phone_number_id})")
        if not args.apply:
            print("\nDry-run only. Re-run with --apply to delete."); return
        for r in targets:
            conv_ids = select(Conversation.id).where(Conversation.restaurant_id == r.id)
            await s.execute(delete(Escalation).where(Escalation.restaurant_id == r.id))
            await s.execute(delete(Message).where(Message.conversation_id.in_(conv_ids)))
            await s.execute(delete(Order).where(Order.restaurant_id == r.id))
            await s.execute(delete(Conversation).where(Conversation.restaurant_id == r.id))
            await s.execute(delete(Customer).where(Customer.restaurant_id == r.id))
            await s.execute(delete(MenuItem).where(MenuItem.restaurant_id == r.id))
            await s.execute(delete(MenuCategory).where(MenuCategory.restaurant_id == r.id))
            await s.execute(delete(OwnerUser).where(OwnerUser.restaurant_id == r.id))
            await s.execute(delete(Restaurant).where(Restaurant.id == r.id))
        await s.commit()
        print(f"Deleted {len(targets)} restaurant(s).")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    p.add_argument("--keep", action="append", default=[])
    p.add_argument("--include-owned", action="store_true")
    asyncio.run(main(p.parse_args()))
