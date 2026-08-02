"""add no_face_detected to proctor_event_type

Revision ID: 21269d4e02a9
Revises: b9a0b16a9442
Create Date: 2026-08-02 03:11:08.874634

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '21269d4e02a9'
down_revision: Union[str, None] = 'b9a0b16a9442'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE proctor_event_type ADD VALUE IF NOT EXISTS 'no_face_detected'")


def downgrade() -> None:
    pass  # Postgres cannot easily drop an enum value; leaving it is harmless.
