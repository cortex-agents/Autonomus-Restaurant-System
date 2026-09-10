#!/bin/sh
set -e
alembic upgrade head
python scripts/seed_sample_restaurant.py
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
