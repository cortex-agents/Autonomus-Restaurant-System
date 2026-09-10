import asyncio
from sqlalchemy import select
from app.db.session import SessionLocal
from app.db.models import Restaurant
async def main():
 async with SessionLocal() as s:
  for r in (await s.execute(select(Restaurant))).scalars():print(r.id,r.name,r.whatsapp_number)
asyncio.run(main())
