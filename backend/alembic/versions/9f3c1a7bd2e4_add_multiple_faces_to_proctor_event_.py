"""add multiple_faces to proctor_event_type

Revision ID: 9f3c1a7bd2e4
Revises: 7d66c64a3491
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '9f3c1a7bd2e4'
down_revision: Union[str, None] = '7d66c64a3491'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE proctor_event_type ADD VALUE IF NOT EXISTS 'multiple_faces'")


def downgrade() -> None:
    pass  # Postgres cannot easily drop an enum value; leaving it is harmless.
