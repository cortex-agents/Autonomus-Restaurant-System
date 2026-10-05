"""Phase 1: webhook lock-down, production config checks, channel selection, login throttle."""
import hashlib
import hmac
import json
import pytest
from httpx import AsyncClient, ASGITransport

from app import main as app_main
from app.api import auth as auth_api
from app.channels import get_channel
from app.channels.evolution.handler import EvolutionHandler
from app.channels.whatsapp.handler import WhatsAppHandler
from app.channels.whatsapp.verify import verify_signature
from app.config import Settings, validate_production_settings

STRONG = "x" * 40


def make_settings(**kw):
    return Settings(_env_file=None, **kw)


def evo_payload(jid="923001112222@s.whatsapp.net", from_me=False, text="menu", instance="inst-a"):
    return {
        "event": "messages.upsert", "instance": instance,
        "data": {"key": {"remoteJid": jid, "fromMe": from_me, "id": "MSG1"},
                 "message": {"conversation": text}, "messageTimestamp": 1},
    }


@pytest.fixture
def client():
    return AsyncClient(transport=ASGITransport(app=app_main.app), base_url="http://test")


@pytest.fixture
def queued(monkeypatch):
    sent = []

    async def fake_enqueue(msg):
        sent.append(msg)

    monkeypatch.setattr("app.api.evolution_webhook.enqueue_message", fake_enqueue)
    monkeypatch.setattr("app.api.whatsapp.enqueue_message", fake_enqueue)
    return sent


def use_settings(monkeypatch, s):
    monkeypatch.setattr("app.api.evolution_webhook.get_settings", lambda: s)
    monkeypatch.setattr("app.api.whatsapp.get_settings", lambda: s)


# ---------- Evolution webhook ----------

@pytest.mark.asyncio
async def test_evolution_webhook_404_when_channel_is_meta(client, queued, monkeypatch):
    use_settings(monkeypatch, make_settings(active_channel="meta"))
    r = await client.post("/webhooks/evolution", json=evo_payload())
    assert r.status_code == 404 and queued == []


@pytest.mark.asyncio
async def test_evolution_webhook_rejects_missing_or_wrong_secret(client, queued, monkeypatch):
    use_settings(monkeypatch, make_settings(active_channel="evolution", evolution_webhook_secret="s3cret"))
    assert (await client.post("/webhooks/evolution", json=evo_payload())).status_code == 401
    assert (await client.post("/webhooks/evolution", json=evo_payload(), headers={"X-Webhook-Secret": "nope"})).status_code == 401
    assert (await client.post("/webhooks/evolution?token=nope", json=evo_payload())).status_code == 401
    assert queued == []  # nothing from an unauthenticated caller reached the queue


@pytest.mark.asyncio
async def test_evolution_webhook_accepts_secret_via_header_or_query(client, queued, monkeypatch):
    use_settings(monkeypatch, make_settings(active_channel="evolution", evolution_webhook_secret="s3cret"))
    r1 = await client.post("/webhooks/evolution", json=evo_payload(), headers={"X-Webhook-Secret": "s3cret"})
    r2 = await client.post("/webhooks/evolution?token=s3cret", json=evo_payload(text="hi"))
    assert r1.status_code == 200 and r2.status_code == 200
    assert [m["phone_number_id"] for m in queued] == ["inst-a", "inst-a"]
    assert queued[0]["from"] == "923001112222"


@pytest.mark.asyncio
async def test_evolution_webhook_ignores_groups_own_messages_and_bad_json(client, queued, monkeypatch):
    use_settings(monkeypatch, make_settings(active_channel="evolution", evolution_webhook_secret="s3cret"))
    h = {"X-Webhook-Secret": "s3cret"}
    await client.post("/webhooks/evolution", json=evo_payload(jid="120363000@g.us"), headers=h)
    await client.post("/webhooks/evolution", json=evo_payload(from_me=True), headers=h)
    await client.post("/webhooks/evolution", json=evo_payload(jid="status@broadcast"), headers=h)
    assert queued == []
    bad = await client.post("/webhooks/evolution", content=b"not json", headers={**h, "Content-Type": "application/json"})
    assert bad.status_code == 400


# ---------- Meta webhook ----------

@pytest.mark.asyncio
async def test_meta_webhook_404_when_channel_is_evolution(client, queued, monkeypatch):
    use_settings(monkeypatch, make_settings(active_channel="evolution"))
    assert (await client.post("/webhooks/whatsapp", json={})).status_code == 404


@pytest.mark.asyncio
async def test_meta_webhook_fails_closed_in_production_without_app_secret(client, queued, monkeypatch):
    use_settings(monkeypatch, make_settings(active_channel="meta", environment="production"))
    r = await client.post("/webhooks/whatsapp", json={"entry": []})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_meta_webhook_valid_signature_still_works(client, queued, monkeypatch):
    use_settings(monkeypatch, make_settings(active_channel="meta", environment="production", whatsapp_app_secret="appsecret"))
    body = json.dumps({"entry": []}).encode()
    sig = "sha256=" + hmac.new(b"appsecret", body, hashlib.sha256).hexdigest()
    r = await client.post("/webhooks/whatsapp", content=body, headers={"X-Hub-Signature-256": sig, "Content-Type": "application/json"})
    assert r.status_code == 200


def test_verify_signature_require_secret_fails_closed_but_dev_default_unchanged():
    assert verify_signature(b"{}", None, None, require_secret=True) is False
    assert verify_signature(b"{}", None, "", require_secret=True) is False
    assert verify_signature(b"{}", None, "") is True  # dev behaviour preserved


# ---------- production config ----------

def test_production_validation_flags_default_secrets():
    s = make_settings(environment="production", active_channel="evolution")
    problems = " | ".join(validate_production_settings(s))
    assert "DASHBOARD_JWT_SECRET" in problems and "EVOLUTION_WEBHOOK_SECRET" in problems and "EVOLUTION_API_KEY" in problems


def test_production_validation_passes_with_real_values():
    s = make_settings(environment="production", active_channel="evolution", dashboard_jwt_secret=STRONG,
                      evolution_webhook_secret="w" * 20, evolution_api_key="k" * 20)
    assert validate_production_settings(s) == []
    m = make_settings(environment="production", active_channel="meta", dashboard_jwt_secret=STRONG,
                      whatsapp_app_secret="a" * 20, whatsapp_webhook_verify_token="verify-xyz-123")
    assert validate_production_settings(m) == []


@pytest.mark.asyncio
async def test_app_refuses_to_boot_in_production_with_unsafe_config(monkeypatch):
    monkeypatch.setattr(app_main, "s", make_settings(environment="production", active_channel="evolution"))
    with pytest.raises(RuntimeError, match="Unsafe production configuration"):
        async with app_main.app.router.lifespan_context(app_main.app):
            pass


@pytest.mark.asyncio
async def test_app_boots_in_development_with_defaults(monkeypatch):
    monkeypatch.setattr(app_main, "s", make_settings(environment="development"))
    async with app_main.app.router.lifespan_context(app_main.app):
        pass


# ---------- channel selection ----------

def test_get_channel_follows_active_channel(monkeypatch):
    monkeypatch.setattr("app.channels.get_settings", lambda: make_settings(active_channel="evolution"))
    assert isinstance(get_channel(), EvolutionHandler)
    monkeypatch.setattr("app.channels.get_settings", lambda: make_settings(active_channel="meta"))
    assert isinstance(get_channel(), WhatsAppHandler)


# ---------- login throttle ----------

@pytest.mark.asyncio
async def test_login_is_throttled_after_repeated_failures(client):
    auth_api._FAILS.clear()
    body = {"email": "nobody@example.com", "password": "wrong"}
    codes = [(await client.post("/api/auth/login", json=body)).status_code for _ in range(11)]
    assert codes[:10] == [401] * 10 and codes[10] == 429
    other = await client.post("/api/auth/login", json={"email": "other@example.com", "password": "x"})
    assert other.status_code == 401  # a different account is not locked out
    auth_api._FAILS.clear()
