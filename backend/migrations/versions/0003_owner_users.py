from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_owner_users"
down_revision = "0002_gap_fixes"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "owner_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("restaurants.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("restaurant_id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("idx_owner_users_restaurant", "owner_users", ["restaurant_id"])


def downgrade():
    op.drop_index("idx_owner_users_restaurant", table_name="owner_users")
    op.drop_table("owner_users")
