"""Evolution API (Baileys) handler — TESTING ONLY, not for production."""
import httpx
from app.config import get_settings


class EvolutionHandler:
    def __init__(self):
        s = get_settings()
        self.base_url = s.evolution_base_url
        self.api_key = s.evolution_api_key

    async def send_message(self, instance_name: str, to: str, body: str) -> dict:
        # Evolution expects the bare number (digits, country code, no '+', no '@s.whatsapp.net')
        number = to.split("@")[0].lstrip("+")
        url = f"{self.base_url}/message/sendText/{instance_name}"
        headers = {"apikey": self.api_key, "Content-Type": "application/json"}
        payload = {"number": number, "text": body}
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers)
            return resp.json()