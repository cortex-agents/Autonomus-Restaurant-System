"""${message}"""
revision = '${up_revision}'
down_revision = ${repr(down_revision)}
from alembic import op
import sqlalchemy as sa
${imports or ""}
def upgrade():
    ${upgrades if upgrades else "pass"}
def downgrade():
    ${downgrades if downgrades else "pass"}
