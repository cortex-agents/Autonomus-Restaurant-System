# Restaurant Digital FTE Backend

Multi-tenant FastAPI + PostgreSQL + Redis Streams backend matching the repository specs.

## Local

1. Copy `backend/.env.example` to `backend/.env`.
2. Set secrets/credentials.
3. Run `docker compose --env-file backend/.env up --build` (the same file feeds Evolution's key and webhook secret).
4. API: http://localhost:8000
5. Health: http://localhost:8000/health

The API container runs Alembic migrations and seeds sample tenants on startup.

## Messaging channel (Evolution now, Meta later)

`ACTIVE_CHANNEL=evolution` uses Evolution API. Create **one Evolution instance per restaurant**, scan its
QR code with that restaurant's WhatsApp number, and store the instance name in
`restaurants.phone_number_id`. The webhook routes by instance name, so a message can only ever reach the
restaurant that owns that number. Switching to the Meta Cloud API later is `ACTIVE_CHANNEL=meta` plus
`WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_APP_SECRET`, and `phone_number_id` set to Meta's ID. No code change.

With `ENVIRONMENT=production` the API refuses to start if the JWT secret, webhook secret or channel
credentials are missing or still defaults.

## Owner login

Run `alembic upgrade head` from `backend/` first, then use `backend/scripts/create_owner.py --email ... --password ... --restaurant-id ...` to create or rotate a restaurant owner's credentials in the `owner_users` table.

If the legacy `OWNER_ACCOUNTS_FILE` contains existing owners, migrate them once with:

`backend/scripts/migrate_legacy_owners.py`

After verifying database login, remove the legacy owner JSON file and unset `OWNER_ACCOUNTS_FILE`.

For new tenants, use one command:

`backend/scripts/onboard_restaurant.py --name ... --whatsapp-number ... --phone-number-id ... --owner-email ... --owner-password ... --categories "Burgers,Pizzas"`

This creates the restaurant, owner login, and optional starter categories without code changes.

## Operational behavior

Order responses include the tenant-scoped customer and conversation identifiers. Human escalation pauses
automated replies until the conversation is resolved, and repeated escalation requests reuse the existing
open handoff. Order confirmations, owner new-order alerts, and dashboard status changes use the active
WhatsApp channel. Failed outbound messages are logged and surfaced as tenant-scoped dashboard escalations.

## Tests

`cd backend && pytest`
