import asyncio
import logging
import re
import time
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
from zoneinfo import ZoneInfo
from app.agent.tools import AgentTools
from app.agent import cart as cart_utils
from app.agent.menu_format import format_menu, filter_groups
from app.agent import nlu

logger = logging.getLogger(__name__)
# When the LLM is unusable (no credits / bad key / outage) skip it for a while instead of making
# every customer wait for a failing API call before the deterministic engine answers.
_LLM_DISABLED_UNTIL = 0.0
LLM_TIMEOUT_SECONDS = 15

ESCALATION_TRIGGERS = [
    ("refund", "refund/compensation request"), ("compensation", "refund/compensation request"),
    ("complaint", "complaint"), ("human", "explicit human request"), ("manager", "explicit human request"),
    ("allergy", "allergy/ingredient safety question"), ("angry", "abusive or aggressive language"),
]
CONFIRM_WORDS = ["bas", "confirm", "done", "ho gaya", "bas itna", "yehi"]
# Whole-word match so "basmati" / "abandoned" never trigger checkout.
_CONFIRM_RE = re.compile(r"\b(?:" + "|".join(re.escape(w) for w in CONFIRM_WORDS) + r")\b")
PAYMENT_CASH = ["cash", "cod"]
PAYMENT_CARD = ["card"]
QTY_ITEM_RE = re.compile(r"(\d+)\s*[xX]?\s*([a-zA-Z ]+)")


def _is_open(restaurant) -> bool:
    if not restaurant.opening_time or not restaurant.closing_time:
        return True
    try:
        now_local = datetime.now(ZoneInfo(restaurant.timezone or "Asia/Karachi")).time()
    except Exception:
        now_local = datetime.now(dt_timezone.utc).time()
    o, c = restaurant.opening_time, restaurant.closing_time
    if o <= c:
        return o <= now_local <= c
    return now_local >= o or now_local <= c  # overnight window (e.g. 12:00 -> 02:00)


class AgentService:
    """
    Order-taking agent boundary (Section 8/9). Uses a real OpenAI Agents SDK
    call when OPENAI_API_KEY is configured; otherwise (and on any SDK failure)
    falls back to a deterministic order-flow engine so the full cart -> address
    -> payment -> finalize path always works, even without a paid API key.
    """
    def __init__(self, session, restaurant, customer, conversation):
        self.session = session; self.restaurant = restaurant
        self.customer = customer; self.conversation = conversation
        self.tools = AgentTools(session, restaurant, customer, conversation)

    async def handle(self, text: str) -> str:
        low = text.lower().strip()

        for needle, reason in ESCALATION_TRIGGERS:
            if re.search(r"\b" + re.escape(needle), low):
                return await self.tools.escalate_to_human(reason)

        if not _is_open(self.restaurant):
            return f"Hum abhi closed hain — timing {self.restaurant.opening_time.strftime('%H:%M')} se {self.restaurant.closing_time.strftime('%H:%M')} tak hai."
                # Critical checkout states must stay deterministic.
        # The LLM should not override persisted cart/address/payment state.
        if self.conversation.order_stage in (
            "awaiting_address",
            "awaiting_payment",
            "confirming",
        ):
            return await self._handle_deterministic(text)

        # Try the real LLM-driven path first (only if a key is configured and it is not in cooldown).
        global _LLM_DISABLED_UNTIL
        try:
            from app.config import get_settings
            if get_settings().openai_api_key and time.monotonic() >= _LLM_DISABLED_UNTIL:
                result = await asyncio.wait_for(self._handle_with_agents_sdk(text), timeout=LLM_TIMEOUT_SECONDS)
                if result:
                    return result
        except Exception as e:
            status = getattr(e, "status_code", None)
            quota_or_auth = status in (401, 403, 429) or "insufficient_quota" in str(e)
            cooldown = 600 if quota_or_auth else 60
            _LLM_DISABLED_UNTIL = time.monotonic() + cooldown
            logger.warning("LLM path unavailable (%s: %s); using deterministic engine for %ss",
                           type(e).__name__, str(e)[:160], cooldown)

        return await self._handle_deterministic(text)

    async def _menu_text(self, request_text: str = "") -> str:
        groups = filter_groups(await self.tools.get_menu_grouped(), request_text)
        return format_menu(self.restaurant.name, groups)

    async def _handle_with_agents_sdk(self, text: str) -> str | None:
        """Best-effort real Agents SDK integration. Returns None to trigger fallback on any issue."""
        from agents import Agent, Runner, function_tool
        from app.agent.prompts import render_prompt
        from app.config import get_settings

        tools_ref = self.tools

        @function_tool
        async def get_menu(query: str = "") -> str:
            rows = await tools_ref.get_menu(query)
            if not rows:
                return "No matching items."
            return ", ".join(f"{r.name} (PKR {r.base_price}) id={r.id}" for r in rows[:25])

        @function_tool
        async def show_menu(category: str = "") -> str:
            """Return this restaurant's menu grouped by category. Pass a category name only if the customer asked for one."""
            return await self._menu_text(category)

        @function_tool
        async def add_to_cart(item_name: str, quantity: int = 1, variant: str | None = None) -> str:
            rows = await tools_ref.get_menu(item_name)
            if not rows:
                return f"'{item_name}' menu mein nahi mila."
            return await tools_ref.add_to_cart(rows[0], quantity, variant)

        @function_tool
        async def get_cart_total() -> str:
            return await tools_ref.get_cart_total()

        @function_tool
        async def set_delivery_info(address: str, payment_method: str) -> str:
            return await tools_ref.set_delivery_info(address, payment_method)

        @function_tool
        async def finalize_order() -> str:
            return await tools_ref.finalize_order()

        agent = Agent(
            name="OrderAgent",
            instructions=render_prompt(self.restaurant),
            model=get_settings().openai_model or None,
            tools=[get_menu, show_menu, add_to_cart, get_cart_total, set_delivery_info, finalize_order],
        )
        from sqlalchemy import select
        from app.db.models import Message
        rows = (await self.session.execute(
            select(Message).where(Message.conversation_id == self.conversation.id)
            .order_by(Message.created_at.desc()).limit(12)
        )).scalars().all()
        history = [
            {"role": "assistant" if m.direction == "outbound" else "user", "content": m.content}
            for m in reversed(rows) if m.content
        ]
        # The current inbound message is already flushed in `rows`; only append if it is missing.
        if not history or history[-1]["role"] != "user" or history[-1]["content"] != text:
            history.append({"role": "user", "content": text})
        result = await Runner.run(agent, history)
        return getattr(result, "final_output", None)

    async def _handle_deterministic(self, text: str) -> str:
        low = text.lower().strip()
        stage = self.conversation.order_stage or "browsing"

        if stage == "complete":
            stage = "browsing"; self.conversation.order_stage = "browsing"

        if stage in ("browsing", "ordering"):
            groups = await self.tools.get_menu_grouped()
            all_items = [it for _, items in groups for it in items]
            cart = cart_utils.cart_from_conversation(self.conversation)

            # 1) precise item matches ("2 zinger burger", "zaiqa deal 1 chahiye")
            added = await self._add_matches(text, all_items)
            cart = cart_utils.cart_from_conversation(self.conversation)

            if _CONFIRM_RE.search(low) and cart.get("items"):
                sub = cart_utils.subtotal(cart)
                if sub < (self.restaurant.min_order_amount or Decimal("0")):
                    return f"Abhi total PKR {sub} hai, hamara minimum order PKR {self.restaurant.min_order_amount} hai — kuch aur add kar dein."
                self.conversation.order_stage = "awaiting_address"
                return "Theek hai! Delivery address bata dein?"
            if added:
                return added

            # 2) menu / category requests ("menu", "sirf burgers dikhao")
            hit = nlu.category_hit(groups, low)
            if nlu.wants_menu(low) or hit:
                return format_menu(self.restaurant.name, hit or groups)

            # 3) loose single-word requests ("zinger")
            cands = nlu.partial_candidates(text, all_items)
            if len(cands) == 1:
                return await self.tools.add_to_cart(cands[0], 1)
            if len(cands) > 1:
                opts = ", ".join(f"{r.name} (PKR {r.base_price})" for r in cands[:5])
                return f"Kaunsa wala chahiye? {opts}"

            if low in {"hi", "hello", "salam", "assalam o alaikum", "assalamualaikum", "aoa"}:
                return "Salam! 👋 Kya order karna chahenge? 'menu' likhein."
            sample = ", ".join(it.name.split("(")[0].strip() for it in all_items[:2]) or "zinger burger"
            return f"Samajh nahi aaya. Item ka naam likhein (jaise '2 {sample.split(',')[0].lower()}') ya 'menu' likhein."

        if stage == "awaiting_address":
            cart = cart_utils.cart_from_conversation(self.conversation)
            cart["delivery_address"] = text.strip()
            self.conversation.cart = cart
            self.conversation.order_stage = "awaiting_payment"
            return "Cash on delivery ya card on delivery?"

        if stage == "awaiting_payment":
            payment = "cash_on_delivery" if any(w in low for w in PAYMENT_CASH) else ("card_on_delivery" if any(w in low for w in PAYMENT_CARD) else None)
            if not payment:
                return "Cash on delivery ya card on delivery — bata dein please."
            cart = cart_utils.cart_from_conversation(self.conversation)
            await self.tools.set_delivery_info(cart.get("delivery_address"), payment)
            return await self.tools.finalize_order()

        if stage == "confirming":
            return await self.tools.finalize_order()

        return "Ji, main order mein help karta hoon. Item ka naam bata dein."

    async def _add_matches(self, text: str, items: list) -> str | None:
        """Add every precisely-matched menu item (default quantity 1); ask when ambiguous."""
        matches, ambiguous = nlu.match_items(text, items)
        replies = []
        for item, qty in matches:
            replies.append(await self.tools.add_to_cart(item, qty))
        for group in ambiguous:
            opts = ", ".join(f"{r.name} (PKR {r.base_price})" for r in group[:5])
            replies.append(f"Kaunsa wala chahiye? {opts}")
        if matches:
            replies.append(await self.tools.get_cart_total())
        return " ".join(replies) if replies else None

    async def escalate(self, reason: str) -> str:
        return await self.tools.escalate_to_human(reason)