# Cortex Agents — Restaurant Order-Taking Digital FTE
## Build Documentation v1.1 (Multi-Tenant, Production-Grade)

> **Note on this revision (v1.1):** Nothing from the original v1.0 doc has been removed or reworded. Everything below is the original content, with additions clearly marked **🆕 Added in v1.1** so the backend and frontend builders can see exactly what's new — mainly: a full backend folder structure, a full frontend (Next.js) folder structure, an explicit API contract between the two, and a tech-stack/language reference table.

**Duration estimate:** 40–60 dev hours for MVP → production
**Builder:** Cortex Agents (Syed) using Claude Code as the Agent Factory
**Target:** A single codebase that can be deployed for MANY restaurants (multi-tenant), not a one-off bot per client

---

## 0. How to Use This Document

This document is the dossier for Claude Code. It is written so that Claude Code can be directed through this build without guessing or inventing requirements. Every section that defines behavior, schema, or contracts is meant to be treated as ground truth — Claude Code should not hallucinate menu logic, escalation rules, or channel formatting beyond what is specified here. Where a decision is genuinely open, it is marked **[DECISION NEEDED]** — Claude Code should ask, not assume.

Feed this file to Claude Code as `context/product-spec.md` and build in the phase order given in Section 6.

**🆕 Added in v1.1:** Since the team has split into a backend builder and a frontend builder, both should treat **Section 7 (Database Schema)** and the new **Section 7A (API Contract)** as the shared contract between them — the backend builder implements it, the frontend builder consumes it, and neither side should invent field names that aren't in these two sections.

---

## 1. Executive Summary

Cortex Agents is building a Restaurant Order-Taking Digital FTE — an AI employee that takes orders over WhatsApp for restaurants and cloud kitchens, 24/7, without breaks, missed messages, or hired staff.

This is not a single-restaurant bot. It is a multi-tenant SaaS product: one codebase, one deployment, serving many restaurants, each with their own WhatsApp number (or shared number with routing), menu, business rules, and order history — fully isolated from each other.

Current cost of a human order-taker in Pakistan: ~PKR 30,000–45,000/month (salary only, excludes turnover, training, and the fact that they can't work 24/7 or handle simultaneous customers).

Target: A Digital FTE that operates at a fraction of that cost per restaurant, available 24/7, handling unlimited simultaneous conversations, with zero missed orders.

---

## 2. The Business Problem (Ground Truth — Do Not Reinterpret)

- Small-to-medium restaurants and cloud kitchens run order-taking manually over WhatsApp and phone calls, usually with 1–2 staff who are also doing other jobs (cooking, counter, delivery coordination).
- During rush hours, multiple customers message at once. Staff cannot reply fast enough. Customers who don't get a quick reply order from a competitor instead — this loss is silent: no complaint, no bad review, just a lost sale the owner never sees.
- Outside business hours (late night, early morning), there is often nobody to answer at all, even though customers are still messaging.
- Order-taking by phone/text is also error-prone: mishears, wrong totals, missed delivery addresses, forgotten add-ons.

**What the agent must solve:**
1. Reply to every customer message instantly, 24/7, regardless of volume.
2. Take a complete, accurate order (items, quantities, variants, delivery address, payment method) through natural WhatsApp conversation.
3. Push the finalized order to the restaurant (kitchen dashboard / WhatsApp group / print).
4. Never let an order fall through — if the agent can't handle something, it escalates to a human immediately instead of guessing or stalling.

---

## 3. Multi-Tenancy — The Core Architectural Requirement

This is the single most important difference from a one-off bot, and it must shape every layer below. Every table, every tool call, every prompt must be scoped to a `restaurant_id`.

- One restaurant's menu, orders, and conversations must never leak into another's.
- The system prompt, menu data, business rules (delivery radius, timings, min order) must be loaded dynamically per restaurant at conversation start — never hardcoded.
- Onboarding a new restaurant should require zero code changes — only new rows in the `restaurants` and `menu_items` tables (and a WhatsApp number mapping).

Claude Code must build this multi-tenant from day one of the Specialization phase. Retrofitting multi-tenancy onto a single-tenant prototype later is expensive — the schema and tool signatures in Section 7 already account for this.

**Channel-to-tenant mapping:** Each restaurant either has (a) its own dedicated WhatsApp Business number, or (b) shares a single Cortex Agents WhatsApp number and is identified by which restaurant's catalog/keyword the customer entered through (e.g. a QR code with a restaurant-specific deep link, or a first-message menu selection).

**[DECISION NEEDED]:** confirm with Syed which model to start with — dedicated numbers are simpler to build first and are the recommended MVP approach; shared-number routing can come later.

---

## 4. Channel Requirements

| Channel | Integration Method | Student/Builder Builds | Response Method |
|---|---|---|---|
| WhatsApp | WhatsApp Business Cloud API (Meta) | Webhook handler, message sender | Reply via WhatsApp Cloud API |
| Owner Dashboard | Next.js web app | Full dashboard UI (orders, menu editor, live status) | Real-time via WebSocket/polling |
| (Future) Web Order Widget | Next.js embeddable component | Optional, not MVP | API response |

MVP is WhatsApp only for the customer-facing side, plus a minimal owner dashboard so each restaurant can see live orders and edit their menu without touching the database directly. Email and SMS are out of scope for v1 — restaurants in this niche do not use them for ordering.

---

## 5. Multi-Channel / Multi-Tenant Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INTAKE LAYER                                │
│  ┌──────────────────┐              ┌──────────────────┐                 │
│  │ WhatsApp Cloud    │              │ Owner Dashboard   │                 │
│  │ API Webhook       │              │ (Next.js)         │                 │
│  └────────┬──────────┘              └────────┬──────────┘                │
│           │                                   │                          │
│           ▼                                   ▼                          │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ FastAPI Ingestion Layer (/webhook, /api)                  │            │
│  │ Resolves restaurant_id from phone number                  │            │
│  └────────────────────────┬────────────────────────────────┘            │
│                            ▼                                             │
│  ┌──────────────────┐  (Redis Streams for MVP, Kafka if scaling beyond   │
│  │ Message Queue    │   ~50 restaurants)                                 │
│  └────────┬──────────┘                                                   │
│           ▼                                                              │
│  ┌──────────────────────┐                                                │
│  │ Order-Taking Agent   │ (OpenAI Agents SDK) scoped per restaurant_id   │
│  └────────┬──────────────┘                                               │
│           │                                                              │
│  ┌────────┼─────────────┐                                                │
│  ▼        ▼             ▼                                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────────┐                              │
│ │PostgreSQL│ │ WhatsApp │ │ Owner        │                              │
│ │ (state,  │ │ Reply    │ │ Dashboard    │                              │
│ │ menu,    │ │          │ │ (new order   │                              │
│ │ orders)  │ │          │ │ notification)│                              │
│ └──────────┘ └──────────┘ └──────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Note on Kafka vs Redis Streams:** The hackathon reference doc uses Kafka because it's built for enterprise scale from day one. For a restaurant MVP with realistically 1–20 restaurants in the first few months, Redis Streams is enough and far cheaper/simpler to run. Claude Code should build the message queue behind a thin interface so it can be swapped for Kafka later without rewriting the agent or handlers. Do not over-engineer the MVP with Kafka/Kubernetes on day one — see Section 6 phase order.

---

## 6. Build Phases

### Phase 1 — Incubation (Hours 1–14): Explore & Prototype with Claude Code

**Objective:** Use Claude Code to explore the problem, discover edge cases in real restaurant ordering conversations, and build a working single-restaurant prototype before generalizing to multi-tenant.

**Dossier setup:**
```
project-root/
├── context/
│   ├── product-spec.md         # This document
│   ├── sample-restaurant.md    # One fake restaurant: menu, hours, delivery zone
│   ├── sample-conversations.json  # 30+ realistic WhatsApp order conversations
│   ├── escalation-rules.md     # When to hand off to a human
│   └── brand-voice.md          # Tone: friendly, casual Roman Urdu/English mix
├── src/
│   ├── channels/
│   ├── agent/
│   └── dashboard/
├── tests/
└── specs/
```

**Exercise 1.1 — Initial exploration prompt for Claude Code:**
```
I need to build a WhatsApp order-taking AI agent for restaurants.
The agent should:
- Take food orders through natural WhatsApp conversation
- Handle menu questions, item variants (size, add-ons), and substitutions
- Collect delivery address and payment method (cash on delivery / card on delivery)
- Calculate the order total correctly, including delivery fee if applicable
- Know when to escalate to a human (complaints, refund requests, unclear/ambiguous items,
  items not on the menu, allergy questions the menu data can't answer)
- Push a finalized order to the restaurant's dashboard

I've provided one sample restaurant's menu and 30 sample conversations in /context.
Analyze the sample conversations first and identify the conversational patterns —
how do real customers order (short messages, typos, Roman Urdu mixed with English,
multiple items in one message, changing their mind mid-order, asking for the menu
first vs jumping straight to ordering)?
```

**What to observe / log in `specs/discovery-log.md`:**
- How customers naturally phrase orders (e.g. "2 zinger burger aur 1 fries" vs a formal structured order)
- How ambiguity shows up (e.g. "burger" when there are 3 burger types on the menu)
- How customers change or cancel items mid-conversation
- How address information is given (sometimes full address, sometimes just an area name requiring a follow-up question)

**Exercise 1.2 — Prototype the core order loop (single restaurant, hardcoded menu):**
```
Build a simple version that:
1. Takes a customer WhatsApp message as input
2. Loads today's menu for the restaurant
3. Extracts order intent: items, quantities, variants
4. Asks clarifying questions when an item is ambiguous or missing details
5. Tracks a running cart across multiple messages in the same conversation
6. Once the customer confirms, calculates the total and asks for address + payment method
7. Confirms the final order back to the customer with a clear summary
```

**Exercise 1.3 — Add memory and state:**
```
The agent needs to remember the cart and conversation context across multiple messages —
customers order in several messages, not one. Track:
- Current cart contents (items, quantities, variants, running total)
- Order stage (browsing / ordering / confirming / awaiting address / awaiting payment method / complete)
- Whether this is a returning customer (use phone number to look up past orders and
  favorite items / saved address)
```

**Exercise 1.4 — Escalation and edge cases:**
```
Add escalation logic for:
- Customer wants to modify/cancel an order that's already been sent to the kitchen
- Customer has a complaint about a past order
- Customer asks about an allergy or ingredient not covered in the menu data
- Customer message is abusive or the conversation is going nowhere after 2 clarification attempts
- Customer explicitly asks for a human ("insaan se baat karni hai", "human", "manager")

When escalating, the agent must:
- Tell the customer a human will follow up (never leave them hanging)
- Notify the restaurant owner immediately via dashboard + WhatsApp alert
- Preserve full conversation context for the human
```

**Incubation deliverables checklist:**
- [ ] Working single-restaurant prototype that handles full order flow
- [ ] `specs/discovery-log.md` documenting conversational patterns found
- [ ] Minimum 20 documented edge cases with how they should be handled
- [ ] Escalation rules finalized and tested against real conversation examples
- [ ] Response tone validated (matches `brand-voice.md`)

---

### Phase 2 — Specialization (Hours 15–45): Production, Multi-Tenant Build

**Objective:** Transform the single-restaurant prototype into a multi-tenant production system. This is where the restaurant-specific logic gets parameterized so ANY restaurant can be onboarded without new code.

#### Production folder structure (original, high level)

```
production/
├── agent/
│   ├── order_agent.py       # Agent definition (restaurant-scoped)
│   ├── tools.py              # All @function_tool definitions
│   ├── prompts.py            # System prompt template (renders per restaurant)
│   └── formatters.py         # WhatsApp message formatting
├── channels/
│   ├── whatsapp_handler.py   # WhatsApp Cloud API integration
├── dashboard/
│   ├── api/                  # FastAPI endpoints for dashboard
│   └── frontend/             # Next.js owner dashboard
├── workers/
│   └── message_processor.py  # Queue consumer + agent runner
├── database/
│   ├── schema.sql
│   └── queries.py
├── tests/
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

#### 🆕 Added in v1.1 — Full Backend Folder Structure (for the backend builder)

This is the same `production/` tree above, expanded to what a production FastAPI + Postgres + Redis backend actually needs once split across two people. Nothing above was removed — this is the fleshed-out version of it.

```
backend/
├── app/
│   ├── main.py                     # FastAPI app entrypoint, mounts routers, CORS, startup/shutdown
│   ├── config.py                   # Settings loaded from .env (pydantic-settings)
│   ├── deps.py                     # Shared FastAPI dependencies (DB session, current_restaurant, auth)
│   │
│   ├── agent/
│   │   ├── order_agent.py          # Agent definition (restaurant-scoped)
│   │   ├── tools.py                # @function_tool definitions (get_menu, add_to_cart, etc.)
│   │   ├── prompts.py              # System prompt template (renders per restaurant)
│   │   ├── formatters.py           # WhatsApp message formatting (line breaks, emoji, price format)
│   │   └── runner.py               # Wires OpenAI Agents SDK run loop with restaurant context
│   │
│   ├── channels/
│   │   └── whatsapp/
│   │       ├── webhook.py          # /webhooks/whatsapp verify + receive endpoints
│   │       ├── client.py           # send_message() via Meta Cloud API
│   │       └── parser.py           # Normalizes Meta webhook payload -> internal message shape
│   │
│   ├── api/                        # 🆕 REST API surface consumed by the frontend (see Section 7A)
│   │   ├── router.py                # Aggregates all sub-routers under /api
│   │   ├── auth.py                  # POST /api/auth/login, /api/auth/refresh
│   │   ├── orders.py                # /api/orders (list, get, update status)
│   │   ├── menu.py                  # /api/menu (CRUD items/categories, toggle availability)
│   │   ├── escalations.py           # /api/escalations (list, reply, resolve)
│   │   ├── settings.py              # /api/settings (hours, delivery fee, min order)
│   │   └── conversations.py         # /api/conversations (read-only, for escalation context)
│   │
│   ├── workers/
│   │   └── message_processor.py    # Redis Streams consumer + agent runner (Section 11 pseudocode)
│   │
│   ├── db/
│   │   ├── session.py               # SQLAlchemy/asyncpg session factory
│   │   ├── models.py                # ORM models mirroring schema.sql (Section 7)
│   │   ├── queries.py               # Hand-written queries where ORM isn't enough
│   │   └── migrations/              # Alembic migration scripts
│   │
│   ├── core/
│   │   ├── security.py              # JWT issue/verify, password hashing
│   │   ├── tenancy.py               # restaurant_id resolution + isolation guard (Section 3 & 15.5)
│   │   ├── queue.py                 # Thin interface over Redis Streams (swappable for Kafka later)
│   │   └── logging.py               # Structured logging setup
│   │
│   └── schemas/                     # Pydantic request/response models used by app/api/*
│       ├── order.py
│       ├── menu.py
│       ├── escalation.py
│       └── auth.py
│
├── tests/
│   ├── test_multitenancy.py         # Section 13 isolation tests
│   ├── test_order_flow.py           # Section 13 conversation-quality tests
│   └── test_api.py                  # 🆕 endpoint-level tests for the frontend contract
│
├── scripts/
│   └── seed_sample_restaurant.py    # 🆕 loads Section 15.1/15.2 sample data for local dev
│
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

#### 🆕 Added in v1.1 — Frontend Folder Structure (Next.js — for the frontend builder)

Section 6 originally only listed `dashboard/frontend/` as a single line. Here is the expanded structure so the frontend builder can start independently of the backend, against the API contract in Section 7A.

```
frontend/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout, providers (auth, theme, query client)
│   ├── page.tsx                      # Redirects to /login or /dashboard
│   │
│   ├── login/
│   │   └── page.tsx                  # Email + password login (Section 15.5)
│   │
│   └── (dashboard)/                  # Route group — everything behind auth
│       ├── layout.tsx                # Sidebar/nav shell, restaurant name/logo
│       ├── orders/
│       │   └── page.tsx              # Live Orders screen (Section 12)
│       ├── menu/
│       │   └── page.tsx              # Menu Editor screen (Section 12)
│       ├── escalations/
│       │   ├── page.tsx              # Escalations list
│       │   └── [id]/page.tsx         # Escalation detail + reply box + conversation context
│       └── settings/
│           └── page.tsx              # Hours, delivery radius, delivery fee, min order
│
├── components/
│   ├── ui/                           # Buttons, inputs, modals, toasts (shared primitives)
│   ├── orders/
│   │   ├── OrderCard.tsx
│   │   └── OrderStatusBadge.tsx
│   ├── menu/
│   │   ├── MenuItemForm.tsx
│   │   └── AvailabilityToggle.tsx
│   └── escalations/
│       └── EscalationThread.tsx
│
├── lib/
│   ├── api-client.ts                 # Typed fetch wrapper, attaches JWT, hits backend from Section 7A
│   ├── auth.ts                       # Token storage/refresh helpers
│   ├── ws.ts                         # WebSocket/polling client for live order updates
│   └── format.ts                     # Currency (PKR), date/time (Asia/Karachi) formatting
│
├── hooks/
│   ├── useOrders.ts                  # Fetch + subscribe to live orders
│   ├── useMenu.ts
│   └── useEscalations.ts
│
├── types/
│   └── api.ts                        # 🆕 TypeScript types generated/kept in sync with Section 7A
│
├── styles/
│   └── globals.css
│
├── public/
├── .env.local.example                # NEXT_PUBLIC_API_BASE_URL, etc.
├── next.config.js
├── package.json
└── tsconfig.json
```

**Exercise 1.1 note carried over:** the incubation-phase `src/dashboard/` folder mentioned in Section 6's dossier setup is just a placeholder for Phase 1 — the real, split backend/frontend structure above is what Phase 2 (Specialization) should actually be built against.

---

## 7. Database Schema (Multi-Tenant — This IS the CRM)

```sql
-- =============================================================================
-- CORTEX AGENTS — RESTAURANT ORDER-TAKING FTE — MULTI-TENANT SCHEMA
-- =============================================================================

-- Restaurants (tenants)
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(50) UNIQUE NOT NULL, -- the number this restaurant receives orders on
    timezone VARCHAR(50) DEFAULT 'Asia/Karachi',
    delivery_radius_km DECIMAL(5,2),
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    opening_time TIME,
    closing_time TIME,
    is_active BOOLEAN DEFAULT TRUE,
    brand_voice TEXT, -- tone instructions specific to this restaurant
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu categories (e.g. Burgers, Beverages, Deals)
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0
);

-- Menu items
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    category_id UUID REFERENCES menu_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE, -- owner can 86 an item instantly
    variants JSONB DEFAULT '[]', -- e.g. [{"name":"Large","price_delta":150}]
    addons JSONB DEFAULT '[]', -- e.g. [{"name":"Extra Cheese","price":50}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers (scoped per restaurant — same phone number at two restaurants = two rows)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    saved_address TEXT,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(restaurant_id, phone)
);

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, ordering, escalated, closed
    order_stage VARCHAR(50) DEFAULT 'browsing', -- browsing, ordering, confirming, awaiting_address, awaiting_payment, complete
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    escalated_reason TEXT
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) NOT NULL,
    direction VARCHAR(20) NOT NULL, -- inbound, outbound
    role VARCHAR(20) NOT NULL, -- customer, agent, system
    content TEXT NOT NULL,
    whatsapp_message_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    conversation_id UUID REFERENCES conversations(id),
    items JSONB NOT NULL, -- [{"item_id":..,"name":..,"qty":2,"variant":..,"addons":[..],"price":..}]
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    delivery_address TEXT NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- cash_on_delivery, card_on_delivery
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, preparing, out_for_delivery, delivered, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Escalations (human handoffs)
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    conversation_id UUID REFERENCES conversations(id) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- open, acknowledged, resolved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_customers_restaurant_phone ON customers(restaurant_id, phone);
CREATE INDEX idx_conversations_restaurant ON conversations(restaurant_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
```

---

## 🆕 7A. API Contract — Backend ↔ Frontend Integration Points (Added in v1.1)

The original doc described the dashboard screens (Section 12) and the folder split (Section 6) but never wrote down the actual endpoints — which is the one thing that lets the backend and frontend builders work in parallel without blocking each other. This section is the contract. Backend builds these exactly; frontend calls these exactly. If either side needs a field that isn't here, add it here first, then build it — don't invent silently on either side.

All endpoints are prefixed `/api` and require `Authorization: Bearer <JWT>` except `/api/auth/login` and the WhatsApp webhook (which uses Meta's verify token, not JWT).

| Method & Path | Purpose | Notes |
|---|---|---|
| `POST /api/auth/login` | Owner login (email + password) | Returns JWT scoped to `restaurant_id` (Section 15.5) |
| `POST /api/auth/refresh` | Refresh an expiring JWT | |
| `GET /api/orders` | List orders for the logged-in restaurant | Filter by `status`, paginate |
| `GET /api/orders/{id}` | Single order detail | |
| `PATCH /api/orders/{id}/status` | Update order status | `pending → confirmed → preparing → out_for_delivery → delivered` (or `cancelled`) |
| `GET /api/menu` | Full menu (categories + items) for this restaurant | |
| `POST /api/menu/items` | Create a menu item | |
| `PATCH /api/menu/items/{id}` | Edit item (price, variants, addons) | |
| `PATCH /api/menu/items/{id}/availability` | Toggle "86" an item instantly | Section 12 requirement |
| `DELETE /api/menu/items/{id}` | Remove item | |
| `GET /api/escalations` | List open/acknowledged/resolved escalations | |
| `GET /api/escalations/{id}` | Escalation detail + full conversation context | Section 12 "reply box" needs this |
| `POST /api/escalations/{id}/reply` | Human sends a reply back to the customer via WhatsApp | |
| `PATCH /api/escalations/{id}/resolve` | Mark escalation resolved | |
| `GET /api/settings` | Current restaurant settings | Hours, delivery radius/fee, min order |
| `PATCH /api/settings` | Update restaurant settings | |
| `GET /api/conversations/{id}` | Read-only conversation transcript | Used by escalation detail view |
| `GET/WS /api/orders/live` | Real-time new-order feed | WebSocket if backend supports it; otherwise frontend polls `GET /api/orders?status=pending` every few seconds (Section 4: "Real-time via WebSocket/polling") |

Every response body must be scoped to the caller's `restaurant_id` — the backend must verify the JWT's `restaurant_id` on every one of these before touching the DB, exactly as Section 15.5 already requires. This is the single most important rule for whoever builds the API layer.

---

## 8. Agent Tools (OpenAI Agents SDK, restaurant-scoped)

Every tool takes `restaurant_id` as part of its context — never as a free-text argument the model can hallucinate. It should be injected from the authenticated conversation context, not asked of the LLM.

```python
# agent/tools.py
from agents import function_tool
from pydantic import BaseModel
from typing import Optional

class MenuLookupInput(BaseModel):
    query: str  # e.g. "burger", "zinger"

class AddToCartInput(BaseModel):
    item_id: str
    quantity: int
    variant: Optional[str] = None
    addons: Optional[list[str]] = []

class SetDeliveryInfoInput(BaseModel):
    address: str
    payment_method: str  # "cash_on_delivery" | "card_on_delivery"

class EscalateInput(BaseModel):
    reason: str

@function_tool
async def get_menu(input: MenuLookupInput) -> str:
    """Look up menu items matching a query for THIS restaurant only.
    Always use this before confirming an item exists — never assume."""
    ...

@function_tool
async def add_to_cart(input: AddToCartInput) -> str:
    """Add an item to the customer's current cart. Validates that the item
    exists, is available, and the variant/addons are valid for this item."""
    ...

@function_tool
async def get_cart_total() -> str:
    """Return the current cart contents and running total, including
    delivery fee if applicable."""
    ...

@function_tool
async def set_delivery_info(input: SetDeliveryInfoInput) -> str:
    """Record delivery address and payment method. Must be called before
    finalizing the order."""
    ...

@function_tool
async def finalize_order() -> str:
    """Create the order record, push it to the restaurant's dashboard,
    and return an order confirmation summary. Only call after cart,
    address, and payment method are all set."""
    ...

@function_tool
async def escalate_to_human(input: EscalateInput) -> str:
    """Hand off the conversation to a human. Use for complaints, refund
    requests, unclear allergy questions, or explicit human requests."""
    ...

@function_tool
async def get_customer_history() -> str:
    """Return this customer's past orders and saved address, if any,
    scoped to this restaurant only."""
    ...
```

---

## 9. System Prompt Template (renders dynamically per restaurant)

```python
# agent/prompts.py
ORDER_AGENT_SYSTEM_PROMPT = """You are the WhatsApp order-taking assistant for {restaurant_name}.

## Your Purpose
Take accurate food orders through natural WhatsApp conversation, 24/7, and make sure
the customer never has to wait for a reply.

## Restaurant Info (use exactly as given — never invent details)
- Opening hours: {opening_time} to {closing_time}
- Delivery radius: {delivery_radius_km} km
- Delivery fee: {delivery_fee}
- Minimum order: {min_order_amount}
- Tone: {brand_voice}

## Hard Rules
- NEVER state a menu item, price, or variant that isn't returned by the get_menu tool.
  If unsure an item exists, call get_menu first.
- NEVER guess a customer's address or payment method — always confirm explicitly.
- NEVER finalize an order without a confirmed cart, address, AND payment method.
- If the restaurant is currently closed (outside opening_time/closing_time), tell the
  customer the hours and do NOT take the order — offer to note it for when they reopen.
- If the order subtotal is below min_order_amount, tell the customer and ask if they'd
  like to add more items before proceeding.

## Escalation Triggers (MUST escalate, never attempt to handle yourself)
- Complaint about a previous order
- Refund or compensation request
- Allergy or ingredient safety question not covered by menu data
- Customer explicitly asks for a human/manager
- Same ambiguous item after 2 clarification attempts
- Abusive or aggressive language

## Conversation Style
- Keep messages short and WhatsApp-native — no long paragraphs.
- Match the customer's language style (Roman Urdu / English mix is normal and expected).
- Always confirm the full order back before finalizing: items, variants, total, address,
  payment method.
"""
```

---

## 10. WhatsApp Handler (Meta Cloud API)

```python
# channels/whatsapp_handler.py
import httpx
import os

class WhatsAppHandler:
    def __init__(self):
        self.api_version = "v20.0"
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")

    async def send_message(self, phone_number_id: str, to: str, body: str) -> dict:
        """Send a WhatsApp text message via Meta Cloud API.
        phone_number_id identifies WHICH restaurant's number is sending —
        this is how multi-tenancy is preserved on the send side too."""
        url = f"https://graph.facebook.com/{self.api_version}/{phone_number_id}/messages"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body}
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers)
            return resp.json()

    async def process_webhook(self, payload: dict) -> list[dict]:
        """Parse Meta webhook payload into normalized messages, each tagged
        with the restaurant's phone_number_id so downstream code knows which
        tenant this belongs to."""
        messages = []
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                phone_number_id = value.get("metadata", {}).get("phone_number_id")
                for msg in value.get("messages", []):
                    messages.append({
                        "phone_number_id": phone_number_id,  # -> resolves restaurant_id
                        "from": msg["from"],
                        "whatsapp_message_id": msg["id"],
                        "content": msg.get("text", {}).get("body", ""),
                        "timestamp": msg.get("timestamp")
                    })
        return messages
```

---

## 11. Message Processor (Queue Consumer)

```python
# workers/message_processor.py
"""
For each incoming message:
1. Resolve restaurant_id from phone_number_id
2. Resolve or create customer (scoped to restaurant_id)
3. Get or create active conversation
4. Store inbound message
5. Load menu + restaurant config, render system prompt
6. Run agent with restaurant-scoped tools
7. Store outbound message
8. Send reply via WhatsApp
9. If order finalized -> push to dashboard + notify owner
10. If escalated -> create escalation record + alert owner immediately
"""
```

---

## 12. Owner Dashboard (Next.js) — Minimum Required Screens

1. **Live Orders** — real-time list of incoming orders with status (pending → preparing → out for delivery → delivered), one-click status updates.
2. **Menu Editor** — add/edit/remove items, toggle availability instantly (86 an item), edit prices and variants.
3. **Escalations** — list of conversations needing human attention, with full context and a reply box.
4. **Settings** — opening hours, delivery radius, delivery fee, minimum order.

**[DECISION NEEDED]:** whether v1 dashboard notifications go via WhatsApp alert to the owner's personal number, a web push notification, or both. Recommended MVP: WhatsApp alert (owners already live in WhatsApp, lowest friction).

**🆕 Added in v1.1:** See Section 7A for the exact endpoints each of these four screens calls.

---

## 13. Deliverables Checklist

**Before Phase 1 starts**
- [ ] All rows in the Open Decisions Log (Section 16) confirmed or overridden
- [ ] WhatsApp Business API setup steps (Section 15.4) completed for the dev/test number

**Phase 1 — Incubation**
- [ ] Single-restaurant working prototype
- [ ] `specs/discovery-log.md`
- [ ] 20+ documented edge cases
- [ ] Escalation rules finalized

**Phase 2 — Specialization**
- [ ] Multi-tenant PostgreSQL schema deployed
- [ ] OpenAI Agents SDK implementation with restaurant-scoped tools
- [ ] WhatsApp Cloud API integration (webhook + send)
- [ ] Owner dashboard (Live Orders, Menu Editor, Escalations, Settings)
- [ ] Message queue (Redis Streams) wired end-to-end
- [ ] Docker Compose for local dev
- [ ] 🆕 API contract (Section 7A) implemented and matches frontend expectations

**Phase 3 — Integration**
- [ ] Multi-tenant isolation tests passing
- [ ] Full order-flow tests passing
- [ ] Load test results at target above
- [ ] Onboarding runbook: steps to add a new restaurant with zero code changes

**🆕 Added in v1.1 — Phase 3.5 (before demo/handover)**
- [ ] Frontend consumes every endpoint in Section 7A against real (not mocked) backend data
- [ ] CORS configured on backend for the frontend's deployed origin
- [ ] End-to-end smoke test: place a WhatsApp order → appears on dashboard within a few seconds → owner updates status → reflected correctly

Load test target for MVP: 5 restaurants, 50 concurrent conversations, WhatsApp webhook-to-reply latency under 5 seconds P95.

```python
# tests/test_multitenancy.py
"""
- Two restaurants with items of the same name and different prices — verify
  agent for Restaurant A never returns Restaurant B's price.
- Customer with the same phone number ordering from two different restaurants —
  verify separate customer records, separate order history, no cross-talk.
- Verify a webhook message tagged with Restaurant A's phone_number_id can NEVER
  trigger a tool call scoped to Restaurant B.
"""

# tests/test_order_flow.py
"""
- Full order flow: browse -> add items -> confirm -> address -> payment -> finalize
- Ambiguous item resolution (e.g. "burger" with 3 matches -> agent asks which one)
- Order below minimum -> agent asks for more items, does not finalize
- Restaurant closed -> agent informs hours, does not take order
- Escalation triggers all fire correctly (complaint, refund, allergy, explicit human request)
- Returning customer -> saved address offered as a shortcut
"""
```

---

## 15. Sample Data & Config Reference (Fills the Gaps — Read Before Building)

This section exists specifically so Claude Code has no ambiguity left to fill in with guesses. Everything referenced but not defined earlier in this document is defined here.

### 15.1 Sample Restaurant — `context/sample-restaurant.md`

Use this as the fake restaurant for Phase 1 Incubation testing.

```
Restaurant: Zaiqa Broast & Grill
WhatsApp Number: +92 300 1234567
Timezone: Asia/Karachi
Opening Hours: 12:00 PM – 2:00 AM (Karachi time)
Delivery Radius: 5 km
Delivery Fee: PKR 100 (free above PKR 2,000 order)
Minimum Order: PKR 500

MENU

-- Burgers --
1. Zinger Burger — PKR 450
   Variants: Regular (+0), Large (+150)
   Addons: Extra Cheese (+50), Extra Patty (+200)
2. Beef Burger — PKR 400
   Variants: Regular (+0), Large (+150)
   Addons: Extra Cheese (+50)

-- Broast --
3. Broast (2 pcs) — PKR 550
4. Broast (4 pcs) — PKR 950
   Addons: Extra Garlic Mayo (+50)

-- Deals --
5. Zaiqa Deal 1 (1 Zinger + Fries + Drink) — PKR 750
6. Family Deal (4 Broast pcs + 2 Zinger + Fries + 2 Drinks) — PKR 2,200

-- Sides --
7. Fries (Regular) — PKR 200
8. Fries (Large) — PKR 300

-- Beverages --
9. Coke (500ml) — PKR 100
10. Coke (1.5L) — PKR 220

Notes:
- All burgers come with a side of coleslaw unless customer requests otherwise.
- No pork products on menu (kitchen note, not a customer-facing FAQ item).
- Kitchen closes order intake at 1:45 AM even though closing time is 2:00 AM (30 min buffer
  is a business rule for MVP, configurable per restaurant later).
```

### 15.2 Sample Conversations — `context/sample-conversations.json` (representative subset)

Claude Code should generate the FULL 30 based on this pattern — these 6 set the bar for realism and cover the core edge cases.

```json
[
  {
    "scenario": "simple_direct_order",
    "messages": [
      {"from": "customer", "text": "2 zinger burger aur 1 large fries"},
      {"from": "agent", "text": "Zinger Burger x2 (Regular) aur Fries (Large) — total PKR 1200. Delivery address bata dein?"},
      {"from": "customer", "text": "House 45 Block C DHA Phase 5"},
      {"from": "agent", "text": "Theek hai! Cash on delivery ya card on delivery?"},
      {"from": "customer", "text": "cash"},
      {"from": "agent", "text": "Order confirm! 2x Zinger Burger, 1x Large Fries — PKR 1200 + delivery. ETA ~40 min."}
    ]
  },
  {
    "scenario": "ambiguous_item",
    "messages": [
      {"from": "customer", "text": "ek burger de do"},
      {"from": "agent", "text": "Zinger Burger (PKR 450) ya Beef Burger (PKR 400)? Konsa chahiye?"},
      {"from": "customer", "text": "zinger wala"},
      {"from": "agent", "text": "Zinger Burger (Regular) add kar diya. Aur kuch?"}
    ]
  },
  {
    "scenario": "menu_question_first",
    "messages": [
      {"from": "customer", "text": "menu bhejo"},
      {"from": "agent", "text": "[full categorized menu with prices]"},
      {"from": "customer", "text": "family deal kya hai"},
      {"from": "agent", "text": "Family Deal: 4pc Broast + 2 Zinger Burger + Fries + 2 Drinks — PKR 2200"}
    ]
  },
  {
    "scenario": "order_below_minimum",
    "messages": [
      {"from": "customer", "text": "1 coke"},
      {"from": "agent", "text": "Coke (500ml) — PKR 100. Hamara minimum order PKR 500 hai, kuch aur add karna chahenge?"}
    ]
  },
  {
    "scenario": "complaint_escalation",
    "messages": [
      {"from": "customer", "text": "kal ka order bilkul theek nahi tha, cold aya"},
      {"from": "agent", "text": "Bohot afsos hua ye sun kar. Main ye seedha manager ko bhej raha hoon, woh jald reply karenge."}
    ]
  },
  {
    "scenario": "closed_hours",
    "messages": [
      {"from": "customer", "text": "order lena hai"},
      {"from": "agent", "text": "Hum abhi closed hain — timing 12PM se 2AM tak hai. 12 baje dobara message kar dein, khushi se order lenge!"}
    ]
  }
]
```

### 15.3 Environment Configuration — `.env.example`

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cortex_restaurant_fte

# Redis (message queue)
REDIS_URL=redis://localhost:6379/0

# WhatsApp Cloud API (Meta)
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
# Note: each restaurant's phone_number_id is stored in the restaurants table,
# NOT here — this token/secret is shared across all tenants under one Meta app.

# OpenAI
OPENAI_API_KEY=

# App
ENVIRONMENT=development # development | staging | production
LOG_LEVEL=INFO
DASHBOARD_JWT_SECRET=
```

**🆕 Added in v1.1 — Frontend `.env.local.example`** (frontend builder needs this, since Section 15.3 only had backend vars):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000/ws
```

### 15.4 WhatsApp Business API Setup (Infra Steps — Not Code, Do First)

These are account-level steps that must happen before any webhook code will actually receive real messages. Claude Code cannot do these — Syed does these manually per Meta's current dashboard flow:

1. Create a Meta Business Account and a Meta App (type: Business).
2. Add the WhatsApp product to the app; Meta provides a test number for development.
3. Generate a temporary access token for dev (24-hour expiry) — for production, generate a permanent System User token with `whatsapp_business_messaging` permission.
4. Set the webhook URL (`https://yourdomain.com/webhooks/whatsapp`) and verify token — Meta sends a GET verification request your endpoint must echo back correctly.
5. Subscribe the app to the `messages` webhook field.
6. For each new restaurant onboarded: register their business phone number in Meta Business Manager, get its `phone_number_id`, add it to the `restaurants` table.
7. Message template approval: WhatsApp only allows free-form replies within a 24-hour window after the customer messages first. Outside that window (e.g. proactively notifying about an order status change after 24h), a pre-approved message template is required. For v1, this limitation is acceptable — restaurants only need to reply within an active order conversation, which is always within the 24h window.

**[DECISION NEEDED]:** whether Cortex Agents runs ONE Meta Business App shared across all client restaurants (each restaurant = one phone number under the same app — recommended, simpler to manage) or a separate Meta App per restaurant (more isolation, much more onboarding overhead). Recommended default: one shared Meta App, per-restaurant numbers.

### 15.5 Dashboard Authentication (MVP Default)

For v1, with a small number of manually-onboarded restaurants:
- Each restaurant gets one owner login (email + password), created manually by Cortex Agents at onboarding time — no self-serve signup in v1.
- JWT-based session auth, scoped to that restaurant's `id`. Dashboard API endpoints must verify the JWT's `restaurant_id` matches the resource being requested — this is the same isolation principle as Section 3, applied to the dashboard.
- No role/permission tiers in v1 — one login per restaurant, full access to that restaurant's data only.

### 15.6 Error & Failure-Mode Handling (Explicit Rules)

| Failure | Required Behavior |
|---|---|
| WhatsApp API send fails | Retry 3x with exponential backoff; if still failing, log to escalations table and alert via dashboard so a human can manually follow up |
| Two messages from same customer within 2 seconds | Queue processes them sequentially per-conversation (not in parallel) using a per-conversation_id lock, so cart state never race-conditions |
| Agent/LLM call fails or times out (>10s) | Send customer a fallback message: "Thori dair lag rahi hai, ek minute mein wapas aata hoon" — retry once, then escalate if it fails again |
| Database connection lost | FastAPI health check fails, Kubernetes/orchestrator restarts pod (or manual restart for MVP single-server setup); in-flight message is NOT lost because it's still in the Redis queue until acknowledged |
| Customer sends an image | v1 response: agent replies "Abhi hum sirf text order le rahe hain, item ka naam likh dein" — image handling is explicitly OUT of scope for v1, not silently ignored |

### 15.7 Conversation Timeout Rules

- A conversation is considered abandoned (not cancelled) if the customer goes silent for 30 minutes mid-order. The cart is preserved in the database but the `order_stage` is marked `abandoned`.
- If the customer messages again within 24 hours, the agent asks: "Aap ka pichla order jaari rakhna chahenge (2x Zinger Burger, PKR 900) ya nayi order start karein?" — never silently resumes without asking.
- After 24 hours of inactivity, the cart is discarded and a new conversation starts fresh.

### 15.8 Deployment Target (MVP Default)

**[DECISION NEEDED — confirmed default below unless Syed specifies otherwise]**

- MVP hosting: Single VPS (e.g. DigitalOcean/Hetzner droplet, 2–4 vCPU / 4–8GB RAM) running the full stack via docker-compose — FastAPI app, Redis, PostgreSQL, message processor worker, all as containers on one machine. This comfortably handles the 1–20 restaurant target in Section 5.
- Domain + TLS: one subdomain (e.g. `api.cortexagents.org`) with Caddy or Nginx + Let's Encrypt for automatic HTTPS — required by Meta for webhook URLs (HTTPS is mandatory).
- Scaling trigger: if restaurant count or message volume grows enough that a single VPS becomes a bottleneck, migrate to Kubernetes per Section 5's note — not before, to avoid premature infrastructure complexity.

**🆕 Added in v1.1 — Frontend deployment note:** the frontend (Next.js dashboard) can deploy separately from the backend VPS — e.g. Vercel, or as a second container on the same VPS behind the same Nginx/Caddy reverse proxy on a separate subdomain (e.g. `dashboard.cortexagents.org`), pointing `NEXT_PUBLIC_API_BASE_URL` at `api.cortexagents.org`. Either works for MVP; same-VPS keeps everything in one docker-compose for simplicity.

---

## 16. Open Decisions Log (Answer Before Claude Code Starts Building)

| # | Decision | Recommended Default (used unless overridden) |
|---|---|---|
| 1 | Dedicated vs shared WhatsApp number per restaurant | Dedicated number per restaurant (Section 3) |
| 2 | One shared Meta Business App vs one per restaurant | One shared Meta App (Section 15.4) |
| 3 | Owner dashboard notification channel | WhatsApp alert to owner's personal number (Section 12) |
| 4 | Dashboard auth model | Single login per restaurant, manually provisioned (Section 15.5) |
| 5 | Deployment target | Single VPS with docker-compose (Section 15.8) |
| 6 | Image messages from customers | Not supported in v1, agent asks for text instead (Section 15.6) |
| 7 | 🆕 Real-time order updates on dashboard | Start with polling (`GET /api/orders` every few seconds) for MVP simplicity; upgrade to WebSocket only if polling feels laggy in practice (Section 7A) |

---

## 17. What This Product Deliberately Does NOT Include in v1

- Payment gateway integration (v1 is cash/card-on-delivery only, no online payment)
- Delivery rider tracking/dispatch (out of scope — restaurant handles delivery separately)
- Kubernetes/Kafka (not needed at 1–20 restaurant scale — Section 5 note)
- Multi-language beyond Roman Urdu/English mix
- Voice ordering
- Image-based ordering (Section 15.6)
- Self-serve restaurant signup (Section 15.5 — manual onboarding only in v1)

Keeping v1 scoped this tightly is intentional — it lets Cortex Agents close and deploy the first few restaurants fast, then expand based on real usage rather than guessed features.

---

## 🆕 18. Tech Stack & Language Reference (Added in v1.1)

A quick lookup table of every language/technology this doc already implies, and what it's for — for onboarding the frontend builder and for anyone else who joins later.

| Layer | Language / Tech | Purpose |
|---|---|---|
| Backend API & webhook server | **Python 3.11+ / FastAPI** | Receives WhatsApp webhooks, serves the `/api/*` REST endpoints for the dashboard (Section 7A), runs the agent |
| Agent logic | **Python — OpenAI Agents SDK** | Defines the order-taking agent, its tools (Section 8), and the system prompt (Section 9) |
| Database | **PostgreSQL** | Multi-tenant relational store — restaurants, menu, customers, conversations, orders, escalations (Section 7) |
| DB access | **SQL + SQLAlchemy/asyncpg (Python)** | Schema defined in raw SQL (`schema.sql`), queried via ORM or hand-written queries |
| Message queue | **Redis Streams** | Buffers inbound WhatsApp messages so the worker processes them in order, per conversation (Section 5, 15.6) |
| Frontend (owner dashboard) | **TypeScript + Next.js (React)** | Live Orders, Menu Editor, Escalations, Settings screens (Section 12) |
| Styling | (your/team's choice — e.g. Tailwind CSS) | Not specified in original doc; pick one and note it here once decided |
| Auth | **JWT** (issued by backend, verified on every API call) | Scopes every dashboard request to one `restaurant_id` (Section 15.5) |
| External integration | **WhatsApp Business Cloud API (Meta)** — REST/JSON over HTTPS | Sending/receiving customer messages (Section 10) |
| Containerization | **Docker + docker-compose** | Runs FastAPI, Postgres, Redis, and the worker together for local dev and MVP deployment (Section 15.8) |
| Infra (MVP) | **Single VPS + Nginx/Caddy + Let's Encrypt** | HTTPS termination, required by Meta for webhooks |
| Testing | **Python (pytest)** | Multi-tenant isolation tests, order-flow tests (Section 13) |

**In one line:** backend is all Python (FastAPI + the Agents SDK talking to Postgres and Redis), frontend is all TypeScript (Next.js/React talking to the backend's REST API), and the two only ever touch each other through the JSON contract in Section 7A — nothing else needs to be shared between the two codebases.

---

*Cortex Agents — Software & AI Automation Agency — www.cortexagents.org*
