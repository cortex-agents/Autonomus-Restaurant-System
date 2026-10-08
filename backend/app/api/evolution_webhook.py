"""
Evolution API (Baileys) webhook.

Translates Evolution's messages.upsert payload into the normalized shape used by
app.workers.message_processor. Evolution runs one *instance* per WhatsApp number;
the instance name is stored in restaurants.phone_number_id, which is how a
message is routed to exactly one restaurant.

Security: every call must carry the shared secret (header ``X-Webhook-Secret`` or
query ``?token=``). The endpoint answers 404 unless ACTIVE_CHANNEL=evolution.
"""
import hmac
import logging

from fastapi import APIRouter, HTTPException, Request
from app.config import get_settings
from app.workers.queue import enqueue_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks/evolution", tags=["evolution"])


def _authorized(request: Request, secret: str | None) -> bool:
    if not secret:
        # Only reachable outside production (startup validation blocks production).
        return True
    provided = request.headers.get("X-Webhook-Secret") or request.query_params.get("token") or ""
    return hmac.compare_digest(provided.encode(), secret.encode())


@router.post("")
async def receive(request: Request):
    s = get_settings()
    if s.active_channel != "evolution":
        raise HTTPException(status_code=404, detail="Not found")
    if not _authorized(request, s.evolution_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    try:
        payload = await request.json()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    event = str(payload.get("event", ""))
    instance = payload.get("instance", "")
    data = payload.get("data") or {}

    if event.lower() not in ("messages.upsert", "messages_upsert"):
        return {"ok": True, "skipped": event}

    key = data.get("key") or {}
    if key.get("fromMe"):
        return {"ok": True, "skipped": "own message"}

    remote_jid = key.get("remoteJid", "")
    # Only 1:1 chats place orders; ignore groups, broadcasts and status updates.
    if remote_jid.endswith("@g.us") or "@broadcast" in remote_jid:
        return {"ok": True, "skipped": "group or broadcast"}

    from_number = remote_jid.split("@")[0]
    message = data.get("message") or {}
    text = message.get("conversation") or (message.get("extendedTextMessage") or {}).get("text", "")

    if instance and from_number:
        await enqueue_message({
            "phone_number_id": instance,
            "from": from_number,
            "whatsapp_message_id": key.get("id", ""),
            "content": text,
            "timestamp": str(data.get("messageTimestamp", "")),
            "push_name": data.get("pushName") or "",
        })
    return {"ok": True}
