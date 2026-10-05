import hashlib
import hmac


def verify_signature(raw_body: bytes, signature_header: str | None, app_secret: str | None, *, require_secret: bool = False) -> bool:
    """
    Verifies Meta's X-Hub-Signature-256 header against the raw request body.

    If app_secret is not configured (empty), verification is skipped and this
    returns True — but only in local/dev setups. With require_secret=True
    (production) a missing secret fails closed and the request is rejected.
    """
    if not app_secret:
        return not require_secret

    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected = hmac.new(
        app_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    provided = signature_header.removeprefix("sha256=")
    return hmac.compare_digest(expected, provided)