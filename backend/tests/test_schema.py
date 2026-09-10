from app.db.models import Base

def test_exact_core_tables():
    assert set(Base.metadata.tables)=={"restaurants","menu_categories","menu_items","customers","conversations","messages","orders","escalations"}
