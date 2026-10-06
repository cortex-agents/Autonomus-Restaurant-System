"""
Restaurant-scoped agent tools (Section 8). Every tool closes over a fixed
(session, restaurant, customer, conversation) instance created per-message in
AgentService — restaurant_id is NEVER an argument the model/customer can set.
"""
from decimal import Decimal
import logging
from sqlalchemy import select
from app.db.models import MenuItem, MenuCategory, Order, Escalation
from app.channels import get_channel
from app.agent import cart as cart_utils

logger = logging.getLogger(__name__)

class AgentTools:
    def __init__(self, session, restaurant, customer, conversation):
        self.session = session
        self.restaurant = restaurant
        self.customer = customer
        self.conversation = conversation

    async def get_menu(self, query: str = ""):
        stmt = select(MenuItem).where(
            MenuItem.restaurant_id == self.restaurant.id,
            MenuItem.is_available.is_(True),
        )
        if query:
            stmt = stmt.where(MenuItem.name.ilike(f"%{query}%"))
        return (await self.session.execute(stmt)).scalars().all()

    async def get_menu_grouped(self):
        """This restaurant's available items grouped by category, in display order.

        Both queries are filtered by self.restaurant.id (resolved from the WhatsApp
        number), so another restaurant's categories or items can never appear.
        """
        rid = self.restaurant.id
        cats = (await self.session.execute(
            select(MenuCategory).where(MenuCategory.restaurant_id == rid)
            .order_by(MenuCategory.display_order, MenuCategory.name)
        )).scalars().all()
        items = (await self.session.execute(
            select(MenuItem).where(MenuItem.restaurant_id == rid, MenuItem.is_available.is_(True))
            .order_by(MenuItem.name)
        )).scalars().all()
        by_cat = {c.id: [] for c in cats}
        other = []
        for it in items:
            (by_cat[it.category_id] if it.category_id in by_cat else other).append(it)
        groups = [(c.name, by_cat[c.id]) for c in cats]
        if other:
            groups.append(("Other", other))
        return groups

    async def add_to_cart(self, item: MenuItem, quantity: int = 1, variant: str | None = None, addons: list | None = None) -> str:
        unit_price = item.base_price
        if variant:
            for v in item.variants or []:
                if v.get("name", "").lower() == variant.lower():
                    unit_price += Decimal(str(v.get("price_delta", 0))); break
        for a in addons or []:
            for opt in item.addons or []:
                if opt.get("name", "").lower() == a.lower():
                    unit_price += Decimal(str(opt.get("price", 0))); break
        cart = cart_utils.cart_from_conversation(self.conversation)
        cart = cart_utils.add_item(cart, item.id, item.name, quantity, unit_price, variant, addons or [])
        self.conversation.cart = cart
        self.conversation.order_stage = "ordering"
        return f"{quantity}x {item.name}" + (f" ({variant})" if variant else "") + " cart mein add ho gaya."

    async def get_cart_total(self) -> str:
        cart = cart_utils.cart_from_conversation(self.conversation)
        if not cart.get("items"):
            return "Cart abhi khali hai."
        sub = cart_utils.subtotal(cart)
        fee = self.restaurant.delivery_fee or Decimal("0")
        lines = ", ".join(f"{i['qty']}x {i['name']}" for i in cart["items"])
        return f"{lines} — subtotal PKR {sub}, delivery PKR {fee}, total PKR {sub + fee}."

    async def set_delivery_info(self, address: str, payment_method: str) -> str:
        cart = cart_utils.cart_from_conversation(self.conversation)
        cart = cart_utils.set_delivery_info(cart, address, payment_method)
        self.conversation.cart = cart
        self.conversation.order_stage = "confirming"
        return "Address aur payment method save ho gaya."

    async def finalize_order(self) -> str:
        cart = cart_utils.cart_from_conversation(self.conversation)
        if not cart.get("items"):
            return "Cart khali hai, pehle kuch order karein."
        if not cart.get("delivery_address") or not cart.get("payment_method"):
            return "Delivery address aur payment method zaroori hai order finalize karne ke liye."
        sub = cart_utils.subtotal(cart)
        if sub < (self.restaurant.min_order_amount or Decimal("0")):
            return f"Minimum order PKR {self.restaurant.min_order_amount} hai, kuch aur add kar dein."
        fee = self.restaurant.delivery_fee or Decimal("0")
        total = sub + fee
        order = Order(
            restaurant_id=self.restaurant.id, customer_id=self.customer.id,
            conversation_id=self.conversation.id, items=cart["items"], subtotal=sub,
            delivery_fee=fee, total=total, delivery_address=cart["delivery_address"],
            payment_method=cart["payment_method"],
        )
        self.session.add(order)
        self.conversation.order_stage = "complete"
        self.conversation.cart = cart_utils.clear_cart()
        self.customer.total_orders = (self.customer.total_orders or 0) + 1
        await self.session.flush()
        lines = ", ".join(f"{i['qty']}x {i['name']}" for i in cart["items"])
        if self.restaurant.owner_whatsapp_number and self.restaurant.phone_number_id:
            try:
                await get_channel().send_message(
                    self.restaurant.phone_number_id,
                    self.restaurant.owner_whatsapp_number,
                    f"New order from {self.customer.phone}: {lines} — total PKR {total}.",
                )
            except Exception:
                logger.exception(
                    "New-order owner notification failed (restaurant=%s, conversation=%s)",
                    self.restaurant.id,
                    self.conversation.id,
                )
                self.session.add(Escalation(
                    restaurant_id=self.restaurant.id,
                    conversation_id=self.conversation.id,
                    reason=f"Failed to send new-order owner notification for conversation {self.conversation.id}",
                ))
        return f"Order confirm! {lines} — total PKR {total}. ETA ~40 min."

    async def escalate_to_human(self, reason: str) -> str:
        existing = (await self.session.execute(select(Escalation).where(
            Escalation.restaurant_id == self.restaurant.id,
            Escalation.conversation_id == self.conversation.id,
            Escalation.status.in_(["open", "acknowledged"]),
        ))).scalar_one_or_none()
        if existing:
            self.conversation.status = "escalated"
            return "Aapki request human team ke paas hai. Woh jald aap se contact karenge."
        self.conversation.status = "escalated"
        self.conversation.escalated_reason = reason
        esc = Escalation(restaurant_id=self.restaurant.id, conversation_id=self.conversation.id, reason=reason)
        self.session.add(esc)
        await self.session.flush()
        # 🆕 Immediate owner alert (Section 12)
        if self.restaurant.owner_whatsapp_number and self.restaurant.phone_number_id:
            try:
                await get_channel().send_message(
                    self.restaurant.phone_number_id, self.restaurant.owner_whatsapp_number,
                    f"⚠️ Escalation ({reason}) — customer {self.customer.phone}",
                )
            except Exception:
                logger.exception(
                    "Escalation owner notification failed (restaurant=%s, conversation=%s)",
                    self.restaurant.id,
                    self.conversation.id,
                )
        return "Main aapki request human team ko forward kar raha hoon. Woh jald aap se contact karenge."

    async def get_customer_history(self):
        stmt = select(Order).where(Order.restaurant_id == self.restaurant.id, Order.customer_id == self.customer.id).order_by(Order.created_at.desc()).limit(5)
        return (await self.session.execute(stmt)).scalars().all()