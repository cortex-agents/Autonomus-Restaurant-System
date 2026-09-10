# RULE: Multi-Tenancy (Non-Negotiable)

This is a multi-tenant SaaS. One codebase serves MANY restaurants. Apply this rule to every task, every file, every table, every endpoint, every prompt — no exceptions.

1. Every table that holds restaurant-specific data MUST have a `restaurant_id` column (or link to a table that does).
2. Every backend function, tool, and API endpoint MUST receive `restaurant_id` from authenticated/verified context (JWT claim or resolved from `phone_number_id`) — NEVER as a free-text argument the LLM or the client can set arbitrarily.
3. Every SQL query MUST filter by `restaurant_id`. No query should ever be able to return another restaurant's rows.
4. Every dashboard API endpoint MUST verify the JWT's `restaurant_id` matches the resource being requested, before returning data.
5. Onboarding a new restaurant = new rows in `restaurants` / `menu_items` tables + a WhatsApp number mapping. Zero code changes.
6. When in doubt, write a test that proves isolation (two restaurants, same item name/phone number, verify no cross-talk) before considering a feature done.

If a Spec or a piece of code doesn't obviously satisfy this rule, stop and ask instead of assuming it's fine.
