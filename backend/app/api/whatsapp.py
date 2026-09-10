from fastapi import APIRouter, Request, Query, HTTPException
from app.config import get_settings
from app.channels.whatsapp.handler import WhatsAppHandler
from app.db.session import SessionLocal
from app.db.models import Restaurant
from sqlalchemy import select
from app.workers.queue import enqueue_message

router=APIRouter(prefix="/webhooks/whatsapp",tags=["whatsapp"])
handler=WhatsAppHandler()
@router.get("")
async def verify(hub_mode:str=Query(alias="hub.mode"),hub_verify_token:str=Query(alias="hub.verify_token"),hub_challenge:str=Query(alias="hub.challenge")):
    s=get_settings()
    if hub_mode!="subscribe" or hub_verify_token!=s.whatsapp_webhook_verify_token:raise HTTPException(status_code=403,detail="Verification failed")
    return int(hub_challenge) if hub_challenge.isdigit() else hub_challenge
@router.post("")
async def receive(request:Request):
    payload=await request.json()
    normalized=handler.process_webhook(payload)
    for msg in normalized:
        if not msg["phone_number_id"] or not msg["from"]:continue
        await enqueue_message(msg)
    return {"ok":True,"queued":len(normalized)}
