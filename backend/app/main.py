from sqlalchemy import inspect

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.router import api_router, root_router
from .config import settings
from .database import SessionLocal, engine
from .services import seed_default_categories

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
def on_startup() -> None:
    inspector = inspect(engine)
    if inspector.has_table('categories'):
        with SessionLocal() as db:
            seed_default_categories(db)


app.include_router(root_router)
app.include_router(api_router)

