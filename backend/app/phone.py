"""Phone-number helpers. Everything stored/compared as bare digits with country code."""
import re

DEFAULT_COUNTRY_CODE = "92"  # Pakistan


def normalize_phone(raw: str | None, default_cc: str = DEFAULT_COUNTRY_CODE) -> str:
    """'+92 300 1234567' / '0300-1234567' / '923001234567@s.whatsapp.net' -> '923001234567'.

    Returns '' for empty input. WhatsApp LID jids are returned unchanged (digits only is wrong for them).
    """
    if not raw:
        return ""
    s = str(raw).strip()
    if s.endswith("@lid"):
        return s
    s = s.split("@")[0]
    digits = re.sub(r"\D", "", s)
    if digits.startswith("00"):
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = default_cc + digits[1:]
    return digits
