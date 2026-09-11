import hmac, hashlib
from app.channels.whatsapp.verify import verify_signature


def test_missing_signature_rejected_when_secret_configured():
    assert verify_signature(b'{"a":1}', None, "supersecret") is False


def test_wrong_signature_rejected():
    body = b'{"a":1}'
    wrong_sig = "sha256=" + "0" * 64
    assert verify_signature(body, wrong_sig, "supersecret") is False


def test_correct_signature_accepted():
    body = b'{"a":1}'
    secret = "supersecret"
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    assert verify_signature(body, f"sha256={expected}", secret) is True


def test_tampered_body_rejected():
    secret = "supersecret"
    original_body = b'{"a":1}'
    sig = "sha256=" + hmac.new(secret.encode(), original_body, hashlib.sha256).hexdigest()
    tampered_body = b'{"a":2}'
    assert verify_signature(tampered_body, sig, secret) is False


def test_dev_mode_skips_verification_when_no_secret_configured():
    # Matches current .env (WHATSAPP_APP_SECRET blank) — intentional for local dev,
    # but production must always set a real secret.
    assert verify_signature(b'{"anything":true}', None, "") is True