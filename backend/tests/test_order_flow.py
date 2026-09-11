"""Real cart-arithmetic tests (pure functions, no DB) — replaces the previous
stub which only checked that a column existed."""
from decimal import Decimal
from app.agent import cart as cart_utils


def test_add_item_and_subtotal():
    cart = cart_utils.clear_cart()
    cart = cart_utils.add_item(cart, "id1", "Zinger Burger", 2, Decimal("450"), None, [])
    cart = cart_utils.add_item(cart, "id2", "Fries", 1, Decimal("200"), "Large", [])
    assert len(cart["items"]) == 2
    assert cart_utils.subtotal(cart) == Decimal("1100")


def test_set_delivery_info_preserves_items():
    cart = cart_utils.clear_cart()
    cart = cart_utils.add_item(cart, "id1", "Coke", 1, Decimal("100"), None, [])
    cart = cart_utils.set_delivery_info(cart, "Some Address", "cash_on_delivery")
    assert cart["delivery_address"] == "Some Address"
    assert cart["payment_method"] == "cash_on_delivery"
    assert len(cart["items"]) == 1


def test_empty_cart_has_zero_subtotal():
    assert cart_utils.subtotal(cart_utils.clear_cart()) == Decimal("0")