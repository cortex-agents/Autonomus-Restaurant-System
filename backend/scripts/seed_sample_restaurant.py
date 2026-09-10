import asyncio
from datetime import time
from decimal import Decimal
from sqlalchemy import select
from app.db.session import SessionLocal
from app.db.models import Restaurant,MenuCategory,MenuItem

MENU={
"Burgers":[("Zinger Burger",450,[{"name":"Regular","price_delta":0},{"name":"Large","price_delta":150}],[{"name":"Extra Cheese","price":50},{"name":"Extra Patty","price":200}]),("Beef Burger",400,[{"name":"Regular","price_delta":0},{"name":"Large","price_delta":150}],[{"name":"Extra Cheese","price":50}])],
"Broast":[("Broast (2 pcs)",550,[],[]),("Broast (4 pcs)",950,[],[{"name":"Extra Garlic Mayo","price":50}])],
"Deals":[("Zaiqa Deal 1 (1 Zinger + Fries + Drink)",750,[],[]),("Family Deal (4 Broast pcs + 2 Zinger + Fries + 2 Drinks)",2200,[],[])],
"Sides":[("Fries (Regular)",200,[],[]),("Fries (Large)",300,[],[])],
"Beverages":[]}
async def main():
 async with SessionLocal() as s:
  r=(await s.execute(select(Restaurant).where(Restaurant.whatsapp_number=="+92 300 1234567"))).scalar_one_or_none()
  if not r:
   r=Restaurant(name="Zaiqa Broast & Grill",whatsapp_number="+92 300 1234567",timezone="Asia/Karachi",delivery_radius_km=5,delivery_fee=100,min_order_amount=500,opening_time=time(12,0),closing_time=time(2,0),brand_voice="friendly, concise, Roman Urdu/English mix")
   s.add(r);await s.flush()
   for n,items in MENU.items():
    c=MenuCategory(restaurant_id=r.id,name=n);s.add(c);await s.flush()
    for name,price,variants,addons in items:s.add(MenuItem(restaurant_id=r.id,category_id=c.id,name=name,base_price=Decimal(str(price)),variants=variants,addons=addons))
   r2=Restaurant(name="Demo Tenant B",whatsapp_number="+92 300 7654321",timezone="Asia/Karachi",delivery_radius_km=3,delivery_fee=150,min_order_amount=300,opening_time=time(10,0),closing_time=time(23,0),brand_voice="concise")
   s.add(r2)
   await s.commit();print("Seeded Restaurant A and dummy Restaurant B")
  else: print("Sample data already exists")
asyncio.run(main())
