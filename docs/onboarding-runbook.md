# Restaurant onboarding runbook

1. Create a restaurant with owner credentials using:
   `python scripts/onboard_restaurant.py --name ... --whatsapp-number ... --phone-number-id ... --owner-email ... --owner-password ... --categories "Burgers,Pizzas"`
2. Ensure `restaurants.phone_number_id` is the routing key (Meta `phone_number_id` or Evolution instance name), not the human-readable `whatsapp_number`.
3. Add/adjust menu items for that restaurant.
4. If needed, rotate credentials with:
   `python scripts/create_owner.py --email ... --password ... --restaurant-id ...`
5. Verify the owner's JWT only returns that restaurant's data.
6. Send a WhatsApp test message and verify tenant resolution via `phone_number_id`, persisted messages, agent reply, order placement, and dashboard visibility.

For an existing deployment that still uses `owner_accounts.json`, run
`python scripts/migrate_legacy_owners.py` once after applying migrations. Verify database login for every owner, then remove the legacy file and unset `OWNER_ACCOUNTS_FILE`.

## Schema note (v1.1, current)
`restaurants.phone_number_id` and `restaurants.owner_whatsapp_number` were added in migration `0002_gap_fixes`. `owner_users` was added in migration `0003_owner_users`. Production routing and login both depend on these columns/tables.