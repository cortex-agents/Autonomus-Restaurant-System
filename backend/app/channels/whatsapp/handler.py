import asyncio, httpx
from app.config import get_settings
class WhatsAppHandler:
    def __init__(self): self.s=get_settings()
    async def send_message(self,phone_number_id,to,body):
        if not self.s.whatsapp_access_token: return {"simulated":True,"to":to,"body":body}
        url=f"https://graph.facebook.com/{self.s.whatsapp_api_version}/{phone_number_id}/messages"
        headers={"Authorization":f"Bearer {self.s.whatsapp_access_token}"}
        payload={"messaging_product":"whatsapp","to":to,"type":"text","text":{"body":body}}
        last=None
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=10) as c:
                    r=await c.post(url,json=payload,headers=headers); r.raise_for_status(); return r.json()
            except Exception as e:
                last=e
                if attempt<2: await asyncio.sleep(2**attempt)
        raise last

    def process_webhook(self,payload):
        messages=[]
        for entry in payload.get("entry",[]):
            for change in entry.get("changes",[]):
                value=change.get("value",{}); phone_number_id=value.get("metadata",{}).get("phone_number_id")
                for msg in value.get("messages",[]):
                    messages.append({"phone_number_id":phone_number_id,"from":msg.get("from"),"whatsapp_message_id":msg.get("id"),"content":msg.get("text",{}).get("body", ""),"timestamp":msg.get("timestamp")})
        return messages
