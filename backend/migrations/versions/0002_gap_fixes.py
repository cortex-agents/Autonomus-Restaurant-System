from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
revision="0002_gap_fixes";down_revision="0001_initial";branch_labels=None;depends_on=None

def upgrade():
    # Restaurant: Meta's phone_number_id (distinct from the human-readable whatsapp_number)
    op.add_column("restaurants", sa.Column("phone_number_id", sa.String(50), unique=True))
    # Restaurant: owner's personal WhatsApp number, for escalation alerts
    op.add_column("restaurants", sa.Column("owner_whatsapp_number", sa.String(50)))
    # Conversation: persisted cart (items/address/payment) across messages
    op.add_column("conversations", sa.Column("cart", postgresql.JSONB(), server_default="{}"))
    # Conversation: last activity timestamp, used for 30-min/24-hour timeout rules
    op.add_column("conversations", sa.Column("last_activity_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")))

def downgrade():
    op.drop_column("conversations", "last_activity_at")
    op.drop_column("conversations", "cart")
    op.drop_column("restaurants", "owner_whatsapp_number")
    op.drop_column("restaurants", "phone_number_id")