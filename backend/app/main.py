from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .api.router import api_router, root_router
from .config import settings
from .security_logging import SecurityLoggingMiddleware

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title=settings.app_name, version=settings.app_version)

# Rate limiter — handles 429 responses for @limiter.limit() decorated routes
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type', 'Accept'],
)

app.add_middleware(SecurityLoggingMiddleware)

app.include_router(root_router)
app.include_router(api_router)
