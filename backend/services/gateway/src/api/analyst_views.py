"""Trader-facing Analyst Views API.

GET /api/v1/analyst-views?category=forex&q=EUR&limit=30
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.auth import get_current_user
from packages.common.src.database import get_db
from packages.common.src import analyst_view_service

router = APIRouter()


@router.get("")
async def list_analyst_views(
    category: Optional[str] = Query(None, description="forex|crypto|stocks|indices|commodities|all"),
    q: Optional[str] = Query(None, description="symbol contains"),
    limit: int = Query(30, ge=1, le=100),
    _user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Active, non-expired analyst views — newest first."""
    items = await analyst_view_service.list_views(db, category=category, q=q, limit=limit)
    return {"items": items, "total": len(items)}
