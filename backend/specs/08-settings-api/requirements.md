# Spec: Settings API

**Build after 02-auth and 01-database-schema.**

## Goal
Implement the restaurant-settings REST endpoints, per `CLAUDE.md` Rule 3 / `docs/product-spec.md` Section 7A, backed by the `restaurants` table (Section 7).

## Requirements
1. `GET /api/settings` — returns the authenticated restaurant's `opening_time`, `closing_time`, `delivery_radius_km`, `delivery_fee`, `min_order_amount`, `brand_voice`, `timezone`.
2. `PATCH /api/settings` — updates any subset of the above fields. Validate: `opening_time`/`closing_time` are valid times, fees/amounts are non-negative.
3. Changes here take effect immediately for the agent — the system prompt template (04-agent-tools, Section 9) must always read current values, never a cached copy, so an owner changing hours or delivery fee is reflected on the very next customer message.
4. `is_active` (whether the restaurant is enabled at all) is intentionally NOT editable via this endpoint in v1 — that's an internal Cortex Agents admin action, not owner-facing.

## Acceptance Criteria
- [ ] Settings read/write scoped to the calling restaurant only
- [ ] Invalid values (negative fee, malformed time) rejected with a clear error
- [ ] Changing `closing_time` to "now" immediately causes the agent to treat the restaurant as closed on the next incoming message (no restart/cache-clear needed)
