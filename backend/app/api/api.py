from fastapi import APIRouter
from app.api.endpoints import chat, dashboard, moodle

api_router = APIRouter()
api_router.include_router(chat.router, prefix="/ai", tags=["ai"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(moodle.router, prefix="/moodle", tags=["moodle"])
