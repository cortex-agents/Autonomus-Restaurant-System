from fastapi.testclient import TestClient
from app.main import app

def test_health():
    r=TestClient(app).get('/health');assert r.status_code==200

def test_protected_without_token():
    r=TestClient(app).get('/api/orders');assert r.status_code==401
