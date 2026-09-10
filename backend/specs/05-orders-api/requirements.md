# Spec: Orders API

**Build after 02-auth and 01-database-schema.**

## Goal
Implement the orders-related REST endpoints for the owner dashboard, per `CLAUDE.md` Rule 3 / `docs/product-spec.md` Section 7A, backed by the `orders` table (Section 7).

## Requirements
1. `GET /api/orders` — list orders for the authenticated restaurant (from JWT, never from a query param). Support filtering by `status` and pagination.
2. `GET /api/orders/{id}` — single order detail (items, subtotal, delivery_fee, total, delivery_address, payment_method, status, timestamps). 404 (not 403) if the order belongs to a different restaurant, to avoid leaking existence.
3. `PATCH /api/orders/{id}/status` — updates status along the allowed pipeline: `pending → confirmed → preparing → out_for_delivery → delivered`, or `cancelled` from any non-terminal state. Reject invalid transitions (e.g. `delivered → pending`) with a 400.
4. `GET /api/orders?status=pending` must be cheap enough to poll every few seconds (see Section 7A note on polling vs WebSocket) — add an index if needed (already covered by `idx_orders_status` in Section 7).
5. Every one of these must go through the `get_current_restaurant` dependency from 02-auth and filter every query by that `restaurant_id`.

## Acceptance Criteria
- [ ] Listing, detail, and status-update all correctly scoped to the calling restaurant only
- [ ] Invalid status transitions rejected with a clear error
- [ ] An order ID belonging to Restaurant B returns 404 when queried with Restaurant A's token
- [ ] Polling endpoint responds fast enough for a few-second refresh interval under the MVP load target (Section 13: 5 restaurants, 50 concurrent conversations)
