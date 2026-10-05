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

Use `backend/scripts/create_owner.py` after the database is seeded and use the restaurant UUID printed/queryable from PostgreSQL.

## Tests

`cd backend && pytest`
