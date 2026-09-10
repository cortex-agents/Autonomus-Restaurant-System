# RESTAURANT — Cortex Agents Digital FTE — Project Rules for Claude Code

This file is auto-loaded by Claude Code at the start of every session in this repo. Treat everything below as hard, non-negotiable constraints. Full detail lives in `docs/product-spec.md` — read the relevant section there before building anything if these summaries aren't enough.

---

## RULE 1: Multi-Tenancy (Non-Negotiable)

This is a multi-tenant SaaS. One codebase serves MANY restaurants. Apply this to every task, every file, every table, every endpoint, every prompt — no exceptions.

1. Every table holding restaurant-specific data MUST have a `restaurant_id` column (or link to a table that does).
2. Every backend function, tool, and API endpoint MUST receive `restaurant_id` from authenticated/verified context (JWT claim or resolved from `phone_number_id`) — NEVER as a free-text argument the LLM or the client can set arbitrarily.
3. Every SQL query MUST filter by `restaurant_id`. No query should ever be able to return another restaurant's rows.
4. Every dashboard API endpoint MUST verify the JWT's `restaurant_id` matches the resource being requested, before returning data.
5. Onboarding a new restaurant = new rows in `restaurants` / `menu_items` tables + a WhatsApp number mapping. Zero code changes.
6. When in doubt, write a test that proves isolation (two restaurants, same item name/phone number, verify no cross-talk) before considering a feature done.

If a piece of code doesn't obviously satisfy this rule, stop and ask instead of assuming it's fine.

---

## RULE 2: Tech Stack (Do Not Substitute)

| Layer | Tech | Notes |
|---|---|---|
| Backend | Python 3.11+, FastAPI | REST API + WhatsApp webhook |
| Agent | Python, OpenAI Agents SDK | Order-taking logic, tools, restaurant-scoped |
| Database | PostgreSQL | Schema is fixed — see docs/product-spec.md Section 7 |
| Queue | Redis Streams | Behind a thin interface, swappable for Kafka later — do NOT introduce Kafka/Kubernetes now |
| Frontend | TypeScript, Next.js (App Router), React | Owner dashboard only (built separately by another dev — do not touch unless asked) |
| Auth | JWT | Scoped to restaurant_id, see Rule 1 |
| Messaging | WhatsApp Business Cloud API (Meta) | REST/JSON over HTTPS |
| Containers | Docker + docker-compose | Single VPS target for MVP |
| Tests | pytest | |

Rules:
- Backend code is Python only.
- Do not add new infra (Kafka, Kubernetes, a different DB, a different queue) without it being written into `docs/product-spec.md` first.
- Backend only communicates with the frontend through the endpoints defined in Rule 3 below. Do not invent new fields or endpoints without updating that section first.

---

## RULE 3: API Contract (Backend ↔ Frontend — Single Source of Truth)

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

**Rule:** You (backend) may not add, rename, or remove a field/endpoint here without updating this section FIRST. This is the only place backend and frontend need to agree — it's what lets both be built in parallel without blocking each other. Full field-level detail is in `docs/product-spec.md` Sections 7 and 7A.

---

## Workflow

- Specs to implement, one at a time, live in `backend/specs/<module>/requirements.md`. Work through them in numeric order (01, 02, 03...) unless told otherwise.
- Each spec has explicit Acceptance Criteria — treat those as the definition of done, and don't consider a module finished until they pass.
- Do not touch anything under `frontend/` — that's owned by a different developer.
- If a spec is ambiguous or missing something, ask before guessing — see `docs/product-spec.md` Section 0 and Section 16 (Open Decisions Log).
