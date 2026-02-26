from fastapi import APIRouter

from app.api.routes.bootstrap import router as bootstrap_router
from app.api.routes.categories import router as categories_router
from app.api.routes.system import router as system_router
from app.api.routes.transactions import router as transactions_router
from app.config import settings

api_router = APIRouter(prefix=settings.api_prefix)
api_router.include_router(bootstrap_router)
api_router.include_router(transactions_router)
api_router.include_router(categories_router)

root_router = APIRouter()
root_router.include_router(system_router)
