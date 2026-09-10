from app.db.models import Order

def test_order_snapshot_column_exists():
    assert Order.__table__.c.items is not None
