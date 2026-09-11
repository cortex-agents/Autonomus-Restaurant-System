import hashlib
import hmac


def verify_signature(raw_body: bytes, signature_header: str | None, app_secret: str) -> bool:
    """
    Verifies Meta's X-Hub-Signature-256 header against the raw request body.

    If app_secret is not configured (empty), verification is skipped and this
    returns True — this only happens in local/dev setups before a real
    WHATSAPP_APP_SECRET is set. In production, app_secret must always be set,
    and any missing/invalid signature must be rejected.
    """
    if not app_secret:
        return True

    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected = hmac.new(
        app_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    provided = signature_header.removeprefix("sha256=")
    return hmac.compare_digest(expected, provided)