from uuid import uuid4
from app.security import create_access_token,decode_token

def test_jwt_contains_tenant():
    rid=uuid4(); token=create_access_token(rid,"owner@example.com"); p=decode_token(token); assert p["restaurant_id"]==str(rid)
