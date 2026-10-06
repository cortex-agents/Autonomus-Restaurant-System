from collections import Counter
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Order, Escalation
from app.db.session import get_db
from app.deps import get_current_restaurant

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
async def summary(
    days: int = Query(30, ge=1, le=365),
    restaurant=Depends(get_current_restaurant),
    session: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    orders_count = (await session.execute(
        select(func.count()).select_from(Order).where(Order.restaurant_id == restaurant.id, Order.created_at >= since)
    )).scalar_one()
    revenue = (await session.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(Order.restaurant_id == restaurant.id, Order.created_at >= since)
    )).scalar_one()
    pending_orders = (await session.execute(
        select(func.count()).select_from(Order).where(Order.restaurant_id == restaurant.id, Order.status == "pending")
    )).scalar_one()

    open_escalations = (await session.execute(
        select(func.count()).select_from(Escalation).where(Escalation.restaurant_id == restaurant.id, Escalation.status.in_(["open", "acknowledged"]))
    )).scalar_one()
    resolved_escalations = (await session.execute(
        select(func.count()).select_from(Escalation).where(Escalation.restaurant_id == restaurant.id, Escalation.status == "resolved", Escalation.created_at >= since)
    )).scalar_one()

    recent_orders = (await session.execute(
        select(Order.items).where(Order.restaurant_id == restaurant.id, Order.created_at >= since).limit(1000)
    )).scalars().all()
    item_counts: Counter[str] = Counter()
    for payload in recent_orders:
        for entry in payload or []:
            name = str(entry.get("name", "")).strip()
            qty = int(entry.get("qty", 1) or 1)
            if name:
                item_counts[name] += qty

    top_items = [{"name": n, "qty": q} for n, q in item_counts.most_common(5)]
    avg_order_value = float(revenue) / orders_count if orders_count else 0.0
    return {
        "range_days": days,
        "orders_count": orders_count,
        "revenue": float(revenue),
        "avg_order_value": avg_order_value,
        "pending_orders": pending_orders,
        "open_escalations": open_escalations,
        "resolved_escalations": resolved_escalations,
        "top_items": top_items,
    }
