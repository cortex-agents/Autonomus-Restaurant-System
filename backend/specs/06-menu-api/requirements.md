# Spec: Menu API

**Build after 02-auth and 01-database-schema.**

## Goal
Implement the menu-editor REST endpoints, per `CLAUDE.md` Rule 3 / `docs/product-spec.md` Section 7A, backed by `menu_categories` and `menu_items` (Section 7).

## Requirements
1. `GET /api/menu` — full menu (categories + items, with variants/addons JSON) for the authenticated restaurant.
2. `POST /api/menu/items` — create an item (name, description, base_price, category_id, variants, addons).
3. `PATCH /api/menu/items/{id}` — edit price, variants, addons, description, category.
4. `PATCH /api/menu/items/{id}/availability` — instant toggle (the "86 an item" requirement from Section 12) — must be a single fast call, not a full item update.
5. `DELETE /api/menu/items/{id}` — remove an item.
6. All writes must verify `category_id` (if provided) belongs to the same restaurant before accepting it — prevents cross-tenant category assignment.
7. This is also what the agent's `get_menu` tool (see 04-agent-tools) reads from — keep the read path efficient since it's called on nearly every customer message.

## Acceptance Criteria
- [ ] CRUD operations all scoped to the calling restaurant
- [ ] Toggling availability is a single lightweight PATCH, reflected immediately in what `get_menu` returns to the agent
- [ ] Attempting to attach an item to another restaurant's category_id is rejected
- [ ] Deleting an item referenced in past orders doesn't break order history (orders store a JSON snapshot of items, per Section 7 — deletion should not cascade into `orders.items`)
