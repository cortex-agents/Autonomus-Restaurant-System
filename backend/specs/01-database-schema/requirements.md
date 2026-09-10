# Spec: Database Schema (Multi-Tenant)

**Paste this whole file into a Qoder Quest task with the Spec toggle ON.**

## Goal
Create the PostgreSQL schema and migrations for the multi-tenant restaurant order-taking system, exactly as defined in `docs/product-spec.md` Section 7. Do not invent additional tables or columns — if something seems missing, ask before adding it.

## Requirements
1. Tables: `restaurants`, `menu_categories`, `menu_items`, `customers`, `conversations`, `messages`, `orders`, `escalations` — exact columns/types as in Section 7.
2. All tenant-scoped tables reference `restaurant_id` (see `.qoder/rules/multi-tenancy.md`).
3. Indexes exactly as listed in Section 7 (customers by restaurant+phone, conversations by restaurant/status, orders by restaurant/status, menu_items by restaurant).
4. Use Alembic (or an equivalent Python migration tool) so schema changes are versioned.
5. Add a seed script (`scripts/seed_sample_restaurant.py`) that loads the sample restaurant data from `docs/product-spec.md` Section 15.1 for local dev/testing.

## Acceptance Criteria
- [ ] `docker-compose up` brings up Postgres with all tables created via migration (not manual SQL)
- [ ] Seed script inserts "Zaiqa Broast & Grill" with its full menu
- [ ] A second dummy restaurant can be seeded and its menu never appears when querying the first restaurant's items
- [ ] All foreign keys and indexes from Section 7 are present
