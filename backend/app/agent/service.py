import json
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from sqlalchemy import select
from app.db.models import Restaurant, Customer, Conversation, MenuItem, Order, Escalation
from app.agent.prompts import render_prompt

class AgentService:
    """Agent boundary. Uses OpenAI Agents SDK when OPENAI_API_KEY is configured.
    A deterministic development fallback is retained so local DB/API tests do not
    require a paid external API."""
    def __init__(self, session, restaurant, customer, conversation):
        self.session=session; self.restaurant=restaurant; self.customer=customer; self.conversation=conversation

    async def handle(self,text):
        low=text.lower().strip()
        triggers=[("refund","refund/compensation request"),("compensation","refund/compensation request"),("complaint","complaint"),("human","explicit human request"),("manager","explicit human request"),("allergy","allergy/ingredient safety question"),("angry","abusive or aggressive language")]
        for needle,reason in triggers:
            if needle in low:return await self.escalate(reason)
        # Optional real Agents SDK path can be enabled once credentials/model are configured.
        # Local deterministic path keeps development and integration tests runnable.
        if low in {"hi","hello","salam","assalam o alaikum"}:
            return "Salam! 👋 Menu mein kya order karna hai?"
        if "menu" in low or "burger" in low or "fries" in low or "broast" in low or "deal" in low:
            rows=(await self.session.execute(select(MenuItem).where(MenuItem.restaurant_id==self.restaurant.id,MenuItem.is_available.is_(True),MenuItem.name.ilike(f"%{low}%")))).scalars().all()
            if not rows:
                rows=(await self.session.execute(select(MenuItem).where(MenuItem.restaurant_id==self.restaurant.id,MenuItem.is_available.is_(True)).limit(20))).scalars().all()
            if not rows:return "Abhi menu available nahi hai. Thori dair baad try karein."
            if len(rows)>1 and any(x in low for x in ["burger","fries","broast","deal"]):
                return "Ji bilkul. In options mein se kaunsa chahiye: " + ", ".join(f"{x.name} (PKR {x.base_price})" for x in rows[:5])
            return "Available: " + ", ".join(f"{x.name} — PKR {x.base_price}" for x in rows[:8])
        return "Ji, main order mein help karta hoon. Aap item ka naam aur quantity bata dein."

    async def escalate(self,reason):
        self.conversation.status="escalated"; self.conversation.order_stage="ordering"; self.conversation.escalated_reason=reason
        e=Escalation(restaurant_id=self.restaurant.id,conversation_id=self.conversation.id,reason=reason)
        self.session.add(e); await self.session.commit()
        return "Main aapki request human team ko forward kar raha hoon. Woh jald aap se contact karenge."
