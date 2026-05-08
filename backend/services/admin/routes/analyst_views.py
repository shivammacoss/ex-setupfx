"""Admin Analyst Views — list, toggle, regenerate."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.database import get_db, TimescaleSessionLocal
from packages.common.src.models import User
from packages.common.src import analyst_view_service
from dependencies import require_permission

router = APIRouter(prefix="/analyst-views", tags=["Analyst Views"])


@router.get("")
async def admin_list_views(
    category: str = "all",
    q: str = "",
    limit: int = 100,
    _admin: User = Depends(require_permission("analytics.read")),
    db: AsyncSession = Depends(get_db),
):
    return await analyst_view_service.list_views(db, category=category or None, q=q or None, limit=limit)


@router.post("/regenerate")
async def admin_regenerate_views(
    _admin: User = Depends(require_permission("analytics.write")),
    db: AsyncSession = Depends(get_db),
):
    """Force a fresh TA pass over all configured symbols."""
    async with TimescaleSessionLocal() as ts:
        try:
            result = await analyst_view_service.regenerate_all(db, ts)
        finally:
            await ts.close()
    return {"status": "ok", **result}


@router.post("/{view_id}/archive")
async def admin_archive_view(
    view_id: str,
    _admin: User = Depends(require_permission("analytics.write")),
    db: AsyncSession = Depends(get_db),
):
    ok = await analyst_view_service.set_active(db, view_id, active=False)
    if not ok:
        raise HTTPException(status_code=404, detail="View not found")
    return {"status": "archived"}


@router.post("/{view_id}/restore")
async def admin_restore_view(
    view_id: str,
    _admin: User = Depends(require_permission("analytics.write")),
    db: AsyncSession = Depends(get_db),
):
    ok = await analyst_view_service.set_active(db, view_id, active=True)
    if not ok:
        raise HTTPException(status_code=404, detail="View not found")
    return {"status": "restored"}
