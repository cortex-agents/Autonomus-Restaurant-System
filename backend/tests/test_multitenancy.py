from app.db.models import Base

def test_schema_is_tenant_scoped():
    for name in ["menu_categories","menu_items","customers","conversations","orders","escalations"]:
        assert "restaurant_id" in Base.metadata.tables[name].c
