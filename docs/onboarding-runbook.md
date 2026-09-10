# Restaurant onboarding runbook

1. Insert the restaurant row with its WhatsApp receiving number and current settings.
2. Insert menu categories/items for that restaurant. No code changes are needed.
3. Register the restaurant number in Meta Business Manager and obtain its phone-number mapping.
4. Provision one owner login with `python backend/scripts/create_owner.py --email ... --password ... --restaurant-id ...`.
5. Verify the owner's JWT only returns that restaurant's data.
6. Send a WhatsApp test message and verify tenant resolution, persisted messages, agent reply and dashboard visibility.

## Important v1 schema note
The fixed v1 schema names the restaurant's receiving WhatsApp number as `restaurants.whatsapp_number`; it does not define a separate `phone_number_id` column or owner-personal WhatsApp destination. The implementation therefore does not invent a new database column/table. Before production Meta onboarding, the project owner should explicitly decide how the Meta `phone_number_id` mapping and owner alert destination are stored.
