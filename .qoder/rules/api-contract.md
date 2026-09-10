# RULE: API Contract (Backend ↔ Frontend — Single Source of Truth)

All endpoints are prefixed `/api` and require `Authorization: Bearer <JWT>` except `/api/auth/login` and the WhatsApp webhook.

| Method & Path | Purpose | Notes |
|---|---|---|
| POST /api/auth/login | Owner login (email + password) | Returns JWT scoped to restaurant_id |
| POST /api/auth/refresh | Refresh an expiring JWT | |
| GET /api/orders | List orders for the logged-in restaurant | Filter by status, paginate |
| GET /api/orders/{id} | Single order detail | |
| PATCH /api/orders/{id}/status | Update order status | pending → confirmed → preparing → out_for_delivery → delivered (or cancelled) |
| GET /api/menu | Full menu (categories + items) | |
| POST /api/menu/items | Create a menu item | |
| PATCH /api/menu/items/{id} | Edit item (price, variants, addons) | |
| PATCH /api/menu/items/{id}/availability | Toggle availability ("86" an item) | |
| DELETE /api/menu/items/{id} | Remove item | |
| GET /api/escalations | List escalations | Filter by status |
| GET /api/escalations/{id} | Escalation detail + full conversation context | |
| POST /api/escalations/{id}/reply | Human reply sent back via WhatsApp | |
| PATCH /api/escalations/{id}/resolve | Mark resolved | |
| GET /api/settings | Current restaurant settings | Hours, delivery radius/fee, min order |
| PATCH /api/settings | Update settings | |
| GET /api/conversations/{id} | Read-only conversation transcript | |
| GET /api/orders?status=pending (polling) | Live order feed for MVP | Poll every few seconds; upgrade to WebSocket later if needed |

## Rule
Neither backend nor frontend may add, rename, or remove a field/endpoint here without updating this file FIRST. This file is the only place both sides need to agree — it is what lets backend and frontend be built in parallel without blocking each other.

Full field-level detail (DB columns, JSON shapes) is in docs/product-spec.md Section 7 (schema) and Section 7A (contract prose).
