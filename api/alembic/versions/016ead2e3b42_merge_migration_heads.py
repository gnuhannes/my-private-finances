"""merge migration heads

Revision ID: 016ead2e3b42
Revises: 3fe8d7df603f, 67f4149462f0
Create Date: 2026-09-14 13:33:43.474500

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "016ead2e3b42"
down_revision: Union[str, Sequence[str], None] = ("3fe8d7df603f", "67f4149462f0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
