from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.router import api_router, root_router
from .config import settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Startup/shutdown hooks are intentionally minimal.
    # Category seeding is handled outside app runtime (migration/CLI).
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(root_router)
app.include_router(api_router)
