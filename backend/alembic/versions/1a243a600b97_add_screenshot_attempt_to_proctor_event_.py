"""add screenshot_attempt to proctor_event_type

Revision ID: 1a243a600b97
Revises: 48097a35122f
Create Date: 2026-08-02 02:49:17.552414

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1a243a600b97'
down_revision: Union[str, None] = '48097a35122f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE proctor_event_type ADD VALUE IF NOT EXISTS 'screenshot_attempt'")


def downgrade() -> None:
    pass  # Postgres cannot easily drop an enum value; leaving it is harmless.
