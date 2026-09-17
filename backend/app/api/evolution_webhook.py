"""
Evolution API (Baileys) webhook — TESTING ONLY.
Translates Evolution's messages.upsert payload into the normalized shape
used by app.workers.message_processor.
"""
from fastapi import APIRouter, Request
from app.workers.queue import enqueue_message

router = APIRouter(prefix="/webhooks/evolution", tags=["evolution"])


@router.post("")
async def receive(request: Request):
    payload = await request.json()
    event = payload.get("event", "")
    instance = payload.get("instance", "")
    data = payload.get("data", {})

    if event.lower() not in ("messages.upsert", "messages_upsert"):
        return {"ok": True, "skipped": event}

    key = data.get("key", {})
    if key.get("fromMe"):
        return {"ok": True, "skipped": "own message"}

    remote_jid = key.get("remoteJid", "")
    from_number = remote_jid.split("@")[0]
    message = data.get("message", {})
    text = message.get("conversation") or (message.get("extendedTextMessage") or {}).get("text", "")

    if instance and from_number:
        await enqueue_message({
            "phone_number_id": instance,
            "from": from_number,
            "whatsapp_message_id": key.get("id", ""),
            "content": text,
            "timestamp": str(data.get("messageTimestamp", "")),
        })
    return {"ok": True}