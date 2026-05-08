"""Trader-facing Market News API.

GET /api/v1/news?tags=EURUSD,Fed&limit=30&refresh=false
GET /api/v1/news/tags
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query

from packages.common.src.auth import get_current_user
from ..services import news_service

router = APIRouter()


@router.get("")
async def list_news(
    tags: Optional[str] = Query(None, description="comma-separated tag filter"),
    limit: int = Query(30, ge=1, le=120),
    refresh: bool = Query(False, description="bypass Redis cache"),
    _user: dict = Depends(get_current_user),
):
    items = await news_service.fetch_news(force=refresh)
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        items = news_service.filter_by_tags(items, tag_list)
    return {"items": items[:limit], "total": len(items[:limit])}


@router.get("/tags")
async def list_tags(_user: dict = Depends(get_current_user)):
    return {"items": news_service.ALL_TAGS}
