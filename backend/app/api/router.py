from fastapi import APIRouter

from app.api.routes.analytics import router as analytics_router
from app.api.routes.bootstrap import router as bootstrap_router
from app.api.routes.categories import router as categories_router
from app.api.routes.system import router as system_router
from app.api.routes.transactions import router as transactions_router
from app.config import settings
from app.gamification.router import router as gamification_router
from app.savings.router import router as savings_router

api_router = APIRouter(prefix=settings.api_prefix)
api_router.include_router(bootstrap_router)
api_router.include_router(transactions_router)
api_router.include_router(categories_router)
api_router.include_router(analytics_router)
api_router.include_router(savings_router)
api_router.include_router(gamification_router)

root_router = APIRouter()
root_router.include_router(system_router)
