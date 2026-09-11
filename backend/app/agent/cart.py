from decimal import Decimal

EMPTY_CART = {"items": [], "delivery_address": None, "payment_method": None}

def cart_from_conversation(conv) -> dict:
    c = dict(conv.cart or {})
    c.setdefault("items", [])
    c.setdefault("delivery_address", None)
    c.setdefault("payment_method", None)
    return c

def add_item(cart: dict, item_id, name: str, qty: int, unit_price: Decimal, variant, addons: list) -> dict:
    cart = {**cart, "items": list(cart.get("items", []))}
    cart["items"].append({
        "item_id": str(item_id),
        "name": name,
        "qty": qty,
        "variant": variant,
        "addons": addons or [],
        "price": float(unit_price),
    })
    return cart

def subtotal(cart: dict) -> Decimal:
    total = Decimal("0")
    for i in cart.get("items", []):
        total += Decimal(str(i["price"])) * int(i.get("qty", 1))
    return total

def set_delivery_info(cart: dict, address: str, payment_method: str) -> dict:
    cart = {**cart}
    cart["delivery_address"] = address
    cart["payment_method"] = payment_method
    return cart

def clear_cart() -> dict:
    return {"items": [], "delivery_address": None, "payment_method": None}