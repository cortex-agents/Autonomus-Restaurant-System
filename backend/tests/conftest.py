import os
os.environ.setdefault("DATABASE_URL","sqlite+aiosqlite:///:memory:")
os.environ.setdefault("DASHBOARD_JWT_SECRET","test-secret")
