# Restaurant Digital FTE Backend

Multi-tenant FastAPI + PostgreSQL + Redis Streams backend matching the repository specs.

## Local

1. Copy `backend/.env.example` to `backend/.env`.
2. Set secrets/credentials.
3. Run `docker compose up --build`.
4. API: http://localhost:8000
5. Health: http://localhost:8000/health

The API container runs Alembic migrations and seeds sample tenants on startup.

## Owner login

Use `backend/scripts/create_owner.py` after the database is seeded and use the restaurant UUID printed/queryable from PostgreSQL.

## Tests

`cd backend && pytest`
