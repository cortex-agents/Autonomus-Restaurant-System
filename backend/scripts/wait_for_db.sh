#!/bin/sh
set -e
alembic upgrade head
if [ "${SEED_DEMO_DATA:-0}" = "1" ] && [ "${ENVIRONMENT:-development}" != "production" ]; then
  python scripts/seed_sample_restaurant.py
fi
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
