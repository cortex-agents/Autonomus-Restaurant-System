import asyncio,json
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from redis.asyncio import Redis
from sqlalchemy import select
from app.config import get_settings
from app.db.session import SessionLocal
from app.db.models import Restaurant,Message,Conversation
from app.db.queries import get_or_create_customer,get_active_conversation
from app.agent.service import AgentService
from app.channels.whatsapp.handler import WhatsAppHandler
from app.workers.reclaim import reclaim_loop

locks=defaultdict(asyncio.Lock)
STREAM="restaurant:inbound"; GROUP="restaurant-workers"; CONSUMER="worker-1"
ABANDON_AFTER=timedelta(minutes=30)
DISCARD_AFTER=timedelta(hours=24)

async def _resolve_restaurant(session,payload):
    # 🆕 Correct mapping: Meta's phone_number_id (not the human-readable whatsapp_number).
    phone_number_id=payload.get("phone_number_id")
    r=None
    if phone_number_id:
        r=(await session.execute(select(Restaurant).where(Restaurant.phone_number_id==phone_number_id))).scalar_one_or_none()
    if not r and payload.get("display_phone_number"):
        r=(await session.execute(select(Restaurant).where(Restaurant.whatsapp_number==payload.get("display_phone_number")))).scalar_one_or_none()
    return r

async def _get_or_create_conversation_with_timeout(session,restaurant_id,customer_id):
    """30-min abandon / 24-hour discard rules per docs/product-spec.md Section 15.7."""
    conv=await get_active_conversation(session,restaurant_id,customer_id)
    now=datetime.now(timezone.utc)
    if conv:
        idle=now - (conv.last_activity_at or conv.started_at)
        if idle > ABANDON_AFTER and conv.status in ("active","ordering") and conv.order_stage!="complete":
            conv.status="abandoned"
            await session.flush()
            resume_text=None
            if idle <= DISCARD_AFTER and conv.cart and conv.cart.get("items"):
                items_summary=", ".join(f"{i.get('qty',1)}x {i.get('name','item')}" for i in conv.cart.get("items",[]))
                resume_text=f"Aap ka pichla order jaari rakhna chahenge ({items_summary}) ya nayi order start karein? (reply: 'jaari rakho' / 'nayi order')"
            new_conv=Conversation(restaurant_id=restaurant_id,customer_id=customer_id,last_activity_at=now)
            if resume_text:
                new_conv.cart={"_pending_resume_cart":conv.cart,"items":[]}
                new_conv.order_stage="awaiting_resume_choice"
            session.add(new_conv); await session.flush()
            return new_conv, resume_text
        conv.last_activity_at=now
        return conv, None
    new_conv=Conversation(restaurant_id=restaurant_id,customer_id=customer_id,last_activity_at=now)
    session.add(new_conv); await session.flush()
    return new_conv, None

async def process_message(payload):
    async with SessionLocal() as session:
        r=await _resolve_restaurant(session,payload)
        if not r: return
        customer=await get_or_create_customer(session,r.id,payload["from"])
        conv,resume_prompt=await _get_or_create_conversation_with_timeout(session,r.id,customer.id)
        lock=locks[conv.id]
        async with lock:
            if resume_prompt:
                reply=resume_prompt
                await session.commit()
            elif conv.order_stage=="awaiting_resume_choice":
                text=payload.get("content","").lower()
                pending=(conv.cart or {}).get("_pending_resume_cart")
                if any(k in text for k in ["jaari","continue","haan","yes"]) and pending:
                    conv.cart=pending; conv.order_stage="ordering"
                    reply="Theek hai, aap ka pichla order jaari hai. Aur kuch add karna hai?"
                else:
                    conv.cart={"items":[]}; conv.order_stage="browsing"
                    reply="Theek hai, nayi order shuru karte hain. Kya lena chahenge?"
                await session.commit()
            elif payload.get("content","") == "":
                reply="Abhi hum sirf text order le rahe hain, item ka naam likh dein"
            else:
                session.add(Message(conversation_id=conv.id,direction="inbound",role="customer",content=payload["content"],whatsapp_message_id=payload.get("whatsapp_message_id")))
                await session.flush()
                try:
                    reply=await asyncio.wait_for(AgentService(session,r,customer,conv).handle(payload["content"]),timeout=10)
                except Exception:
                    reply="Thori dair lag rahi hai, ek minute mein wapas aata hoon"
                session.add(Message(conversation_id=conv.id,direction="outbound",role="agent",content=reply))
                conv.last_activity_at=datetime.now(timezone.utc)
                await session.commit()
            try: await WhatsAppHandler().send_message(r.phone_number_id or payload.get("phone_number_id"),payload["from"],reply)
            except Exception: pass

async def worker():
    redis=Redis.from_url(get_settings().redis_url,decode_responses=True)
    reclaim_task=None
    try:
        try: await redis.xgroup_create(STREAM,GROUP,id="0",mkstream=True)
        except Exception: pass
        reclaim_task=asyncio.create_task(reclaim_loop(redis,CONSUMER,process_message))
        while True:
            rows=await redis.xreadgroup(GROUP,CONSUMER,{STREAM: ">"},count=10,block=5000)
            for _, entries in rows:
                for msg_id,data in entries:
                    try:
                        await process_message(json.loads(data["payload"]))
                        await redis.xack(STREAM,GROUP,msg_id)
                    except Exception:
                        continue
    finally:
        if reclaim_task: reclaim_task.cancel()
        await redis.aclose()

if __name__=="__main__": asyncio.run(worker())