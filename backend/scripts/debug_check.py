import asyncio
from sqlalchemy import select
from app.db.session import SessionLocal
from app.db.models import Restaurant

async def main():
    async with SessionLocal() as s:
        r = (await s.execute(select(Restaurant).where(Restaurant.whatsapp_number=='+92 300 1234567'))).scalar_one_or_none()
        print('opening_time:', r.opening_time, 'closing_time:', r.closing_time, 'timezone:', r.timezone)

asyncio.run(main())