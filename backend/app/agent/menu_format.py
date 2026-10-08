"""WhatsApp-friendly menu text, built only from ONE restaurant's own data.

The caller (AgentTools.get_menu_grouped) is responsible for the tenant scoping;
this module is a pure formatter so it is trivial to unit test.
"""
from decimal import Decimal

WHATSAPP_MAX_CHARS = 3800  # WhatsApp text limit is 4096; keep headroom for the footer


def _money(value) -> str:
    d = Decimal(str(value))
    return str(int(d)) if d == d.to_integral_value() else f"{d:.2f}"


def _variants_text(variants) -> str:
    parts = []
    for v in variants or []:
        if not isinstance(v, dict):
            continue
        name = v.get("name")
        if not name:
            continue
        delta = Decimal(str(v.get("price_delta", 0) or 0))
        parts.append(f"{name} (+{_money(delta)})" if delta else name)
    return " / ".join(parts)


def format_menu(restaurant_name: str, groups: list[tuple[str, list]], currency: str = "PKR") -> str:
    """groups: [(category_name, [MenuItem-like with name/base_price/variants]), ...]"""
    groups = [(name, items) for name, items in groups if items]
    if not groups:
        return "Abhi menu available nahi hai."

    header = f"🍽️ *{restaurant_name}* — Menu"
    footer = "Order ke liye item ka naam aur quantity likhein, jaise: '2 zinger burger'."
    blocks, used, truncated = [], len(header) + len(footer) + 4, False
    for cat_name, items in groups:
        lines = [f"*{cat_name}*"]
        for it in items:
            line = f"• {it.name} — {currency} {_money(it.base_price)}"
            sizes = _variants_text(getattr(it, "variants", None))
            if sizes:
                line += f"\n   _{sizes}_"
            lines.append(line)
        block = "\n".join(lines)
        if used + len(block) + 2 > WHATSAPP_MAX_CHARS:
            truncated = True
            break
        blocks.append(block)
        used += len(block) + 2

    body = "\n\n".join(blocks)
    if truncated:
        body += "\n\n…menu lamba hai. Baqi categories ke liye 'menu <category ka naam>' likhein, jaise 'menu pizza'."
    return f"{header}\n\n{body}\n\n{footer}"


def filter_groups(groups: list[tuple[str, list]], text: str) -> list[tuple[str, list]]:
    """If the customer named a category ("menu burgers", "pizza menu"), keep only that
    category; otherwise return every group unchanged."""
    words = [w for w in text.lower().replace("?", " ").split() if len(w) > 3 and w != "menu"]
    if not words:
        return groups
    matched = [(n, i) for n, i in groups if any(w in n.lower() or n.lower() in w for w in words)]
    return matched or groups
