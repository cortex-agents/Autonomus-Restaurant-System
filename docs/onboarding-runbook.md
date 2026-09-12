# Restaurant onboarding runbook

1. Insert the restaurant row with its WhatsApp receiving number (`whatsapp_number`), Meta's `phone_number_id`, and the owner's personal WhatsApp number (`owner_whatsapp_number` — used for escalation alerts). No code changes are needed.
2. Insert menu categories/items for that restaurant.
3. Register the restaurant's number in Meta Business Manager to obtain its `phone_number_id`, and store it in the `restaurants.phone_number_id` column (this is what the webhook uses to route incoming messages — NOT the human-readable `whatsapp_number`).
4. Provision one owner login with `python scripts/create_owner.py --email ... --password ... --restaurant-id ...`.
5. Verify the owner's JWT only returns that restaurant's data.
6. Send a WhatsApp test message and verify: tenant resolution via `phone_number_id`, persisted messages, agent reply, order placement, and dashboard visibility.

## Schema note (v1.1, current)
`restaurants.phone_number_id` and `restaurants.owner_whatsapp_number` were added in migration `0002_gap_fixes`. Both are required for a restaurant to work correctly in production — `phone_number_id` for inbound message routing, `owner_whatsapp_number` for escalation alerts (Section 12).