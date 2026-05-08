"""Analyst Views — auto-generated trading recommendations.

Stores TA-based or external-feed analyst views shown on /analytics/views.
Each row is a single recommendation for a symbol on a timeframe.

Revision ID: 0012
Revises: 0011
"""
from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "analyst_views",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text("uuid_generate_v4()"),
                  primary_key=True),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("timeframe", sa.String(10), nullable=False),
        sa.Column("direction", sa.String(8), nullable=False),
        sa.Column("expected_pips_min", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("expected_pips_max", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("target_price", sa.Numeric(18, 8), nullable=False),
        sa.Column("pivot_price", sa.Numeric(18, 8), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source", sa.String(20), nullable=False, server_default="ta_engine"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.CheckConstraint("category IN ('forex','crypto','stocks','indices','commodities')",
                           name="analyst_views_category_check"),
        sa.CheckConstraint("direction IN ('up','down','neutral')",
                           name="analyst_views_direction_check"),
    )

    op.create_index("ix_analyst_views_active_cat",
                    "analyst_views",
                    ["category", "is_active", "published_at"])
    op.create_index("ix_analyst_views_symbol", "analyst_views", ["symbol"])
    op.create_index("ix_analyst_views_expires",
                    "analyst_views",
                    ["is_active", "expires_at"])

    # Per-(symbol,timeframe) only one active view at a time.
    op.create_index("ix_analyst_views_unique_active",
                    "analyst_views",
                    ["symbol", "timeframe"],
                    unique=True,
                    postgresql_where=sa.text("is_active = true"))


def downgrade() -> None:
    op.drop_index("ix_analyst_views_unique_active", table_name="analyst_views")
    op.drop_index("ix_analyst_views_expires", table_name="analyst_views")
    op.drop_index("ix_analyst_views_symbol", table_name="analyst_views")
    op.drop_index("ix_analyst_views_active_cat", table_name="analyst_views")
    op.drop_table("analyst_views")
