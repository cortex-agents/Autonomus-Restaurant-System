FROM python:3.11-slim

WORKDIR /app

ENV PYTHONPATH=/app

COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
COPY scripts ./scripts
COPY tests ./tests

RUN chmod +x scripts/wait_for_db.sh

CMD ["./scripts/wait_for_db.sh"]
