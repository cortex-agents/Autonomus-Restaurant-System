import asyncio
from sqlalchemy import select
from app.db.session import SessionLocal
from app.db.models import Restaurant, OwnerUser
async def main():
 async with SessionLocal() as s:
  rows = (await s.execute(
      select(Restaurant, OwnerUser.email)
      .outerjoin(OwnerUser, OwnerUser.restaurant_id == Restaurant.id)
      .order_by(Restaurant.created_at)
  )).all()
  for r, email in rows:
      print(r.id, r.name, r.whatsapp_number, r.phone_number_id, email or "-")
asyncio.run(main())
