import asyncio,json
from collections import defaultdict
from redis.asyncio import Redis
from sqlalchemy import select
from app.config import get_settings
from app.db.session import SessionLocal
from app.db.models import Restaurant,Message
from app.db.queries import get_or_create_customer,get_or_create_conversation
from app.agent.service import AgentService
from app.channels.whatsapp.handler import WhatsAppHandler

locks=defaultdict(asyncio.Lock)
STREAM="restaurant:inbound"; GROUP="restaurant-workers"; CONSUMER="worker-1"
async def process_message(payload):
    async with SessionLocal() as session:
        r=(await session.execute(select(Restaurant).where(Restaurant.whatsapp_number==payload.get("phone_number_id")))).scalar_one_or_none()
        if not r:
            # Production mapping should use a phone_number_id field; v1 schema only names whatsapp_number.
            # Keep a conservative exact mapping and do not accept restaurant_id from payload.
            r=(await session.execute(select(Restaurant).where(Restaurant.whatsapp_number==payload.get("display_phone_number")))).scalar_one_or_none()
        if not r: return
        customer=await get_or_create_customer(session,r.id,payload["from"])
        conv=await get_or_create_conversation(session,r.id,customer.id)
        lock=locks[conv.id]
        async with lock:
            if payload.get("content","") == "":
                reply="Abhi hum sirf text order le rahe hain, item ka naam likh dein"
            else:
                session.add(Message(conversation_id=conv.id,direction="inbound",role="customer",content=payload["content"],whatsapp_message_id=payload.get("whatsapp_message_id")))
                await session.flush()
                try:
                    reply=await asyncio.wait_for(AgentService(session,r,customer,conv).handle(payload["content"]),timeout=10)
                except Exception:
                    reply="Thori dair lag rahi hai, ek minute mein wapas aata hoon"
                session.add(Message(conversation_id=conv.id,direction="outbound",role="agent",content=reply))
                await session.commit()
            try: await WhatsAppHandler().send_message(payload.get("phone_number_id"),payload["from"],reply)
            except Exception: pass

async def worker():
    redis=Redis.from_url(get_settings().redis_url,decode_responses=True)
    try:
        try: await redis.xgroup_create(STREAM,GROUP,id="0",mkstream=True)
        except Exception: pass
        while True:
            rows=await redis.xreadgroup(GROUP,CONSUMER,{STREAM: ">"},count=10,block=5000)
            for _, entries in rows:
                for msg_id,data in entries:
                    try:
                        await process_message(json.loads(data["payload"]))
                        await redis.xack(STREAM,GROUP,msg_id)
                    except Exception:
                        # Leave unacked so it remains recoverable.
                        continue
    finally: await redis.aclose()

if __name__=="__main__": asyncio.run(worker())
