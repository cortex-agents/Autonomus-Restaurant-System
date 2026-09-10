# Spec: Order-Taking Agent + Tools

**Build this AFTER database schema, auth, and the WhatsApp webhook are in place.**

## Goal
Implement the OpenAI Agents SDK order-taking agent, its tools, and the system prompt template, exactly as defined in `docs/product-spec.md` Sections 8 and 9. This is the core "brain" of the product.

## Requirements
1. Tools (all restaurant-scoped via injected context, never a free-text `restaurant_id` argument — see `CLAUDE.md` Rule 1):
   - `get_menu(query)` — looks up items matching a query for the current restaurant only
   - `add_to_cart(item_id, quantity, variant, addons)` — validates item exists, is available, variant/addons valid
   - `get_cart_total()` — returns cart contents + running total incl. delivery fee
   - `set_delivery_info(address, payment_method)` — records address + payment method
   - `finalize_order()` — creates the order record, pushes to dashboard, returns confirmation summary; only callable after cart + address + payment method are all set
   - `escalate_to_human(reason)` — hands off to a human, per the triggers in Section 9
   - `get_customer_history()` — past orders / saved address for this customer at this restaurant only
2. System prompt template renders per-restaurant: `restaurant_name`, `opening_time`, `closing_time`, `delivery_radius_km`, `delivery_fee`, `min_order_amount`, `brand_voice` — exactly the placeholders in Section 9. Never hardcode a specific restaurant's details into the prompt.
3. Hard rules from Section 9 must be enforced (never state a menu item/price not returned by `get_menu`; never guess address/payment method; never finalize without cart+address+payment; respect opening hours; respect minimum order).
4. Escalation triggers from Section 9 must all be wired: complaint, refund/compensation request, allergy/ingredient question not covered by menu data, explicit human request, same ambiguous item after 2 clarification attempts, abusive/aggressive language.
5. Cart + conversation state persists across multiple messages (order_stage: browsing → ordering → confirming → awaiting_address → awaiting_payment → complete), read/written via the `conversations` table.
6. Conversation timeout rules from Section 15.7 (30 min silence = abandoned, cart preserved; ask before resuming within 24h; discard after 24h).

## Acceptance Criteria
- [ ] Full order flow works end-to-end against the sample restaurant/menu (Section 15.1) using the sample conversations (Section 15.2) as test cases
- [ ] Ambiguous item ("burger" with 3 matches) triggers a clarifying question, not a guess
- [ ] Order below minimum is not finalized; agent asks for more items
- [ ] Restaurant-closed hours block order-taking and inform the customer of hours
- [ ] Every escalation trigger fires correctly and notifies via the escalations table
- [ ] Two restaurants with an item of the same name but different price never leak into each other's responses (multi-tenancy test)
