"""Evolution API (Baileys) handler — TESTING ONLY, not for production."""
import httpx
from app.config import get_settings
from app.phone import normalize_phone


class EvolutionSendError(RuntimeError):
    pass


class EvolutionHandler:
    def __init__(self):
        s = get_settings()
        self.base_url = s.evolution_base_url
        self.api_key = s.evolution_api_key

    async def send_message(self, instance_name: str, to: str, body: str) -> dict:
        # Evolution expects the bare number (digits, country code, no '+', no spaces, no '@s.whatsapp.net').
        number = normalize_phone(to)
        if not number:
            raise EvolutionSendError(f"Invalid destination number: {to!r}")
        url = f"{self.base_url}/message/sendText/{instance_name}"
        headers = {"apikey": self.api_key, "Content-Type": "application/json"}
        payload = {"number": number, "text": body}
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code >= 400:
            raise EvolutionSendError(f"Evolution sendText failed: HTTP {resp.status_code} {resp.text[:200]}")
        try:
            return resp.json()
        except ValueError:
            return {}
