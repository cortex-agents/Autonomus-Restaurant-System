"""Store phone numbers as bare digits (country code, no '+'/spaces).

Customers whose normalized phone would collide with an existing customer of the same
restaurant are left untouched (no data loss / no unique-constraint failure).
"""
import re
from alembic import op
import sqlalchemy as sa

revision = "0004_normalize_phones"
down_revision = "0003_owner_users"
branch_labels = None
depends_on = None


def _norm(raw):
    if not raw:
        return raw
    s = str(raw).strip()
    if s.endswith("@lid"):
        return s
    digits = re.sub(r"\D", "", s.split("@")[0])
    if digits.startswith("00"):
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = "92" + digits[1:]
    return digits


def upgrade():
    bind = op.get_bind()
    for rid, wa, owner in bind.execute(sa.text("select id, whatsapp_number, owner_whatsapp_number from restaurants")).all():
        nwa, nowner = _norm(wa), _norm(owner)
        if (nwa, nowner) != (wa, owner):
            clash = bind.execute(sa.text("select 1 from restaurants where whatsapp_number=:n and id<>:i"), {"n": nwa, "i": rid}).first() if nwa else None
            bind.execute(sa.text("update restaurants set whatsapp_number=:a, owner_whatsapp_number=:b where id=:i"),
                         {"a": wa if clash else nwa, "b": nowner, "i": rid})
    existing = {(r, p) for r, p in bind.execute(sa.text("select restaurant_id, phone from customers")).all()}
    for cid, rid, phone in bind.execute(sa.text("select id, restaurant_id, phone from customers")).all():
        n = _norm(phone)
        if n and n != phone and (rid, n) not in existing:
            bind.execute(sa.text("update customers set phone=:p where id=:i"), {"p": n, "i": cid})
            existing.add((rid, n))


def downgrade():
    pass
