"""FastAPI app: CORS, router mounting, startup DB init, consistent error envelope."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import analysis, budget, chat, dashboard, debt, documents, savings, transactions
from app.config import get_settings
from app.db import init_db
from app.logging_config import setup_logging
from app.schemas import HealthResponse

settings = get_settings()
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="FinCoach AI", lifespan=lifespan)

_cors_origins = {settings.cors_origin}
if "localhost" in settings.cors_origin:
    _cors_origins.add(settings.cors_origin.replace("localhost", "127.0.0.1"))
elif "127.0.0.1" in settings.cors_origin:
    _cors_origins.add(settings.cors_origin.replace("127.0.0.1", "localhost"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(_cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        body = {"error": detail}
    else:
        body = {"error": {"code": "http_error", "message": str(detail)}}
    return JSONResponse(status_code=exc.status_code, content=body)


app.include_router(documents.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(debt.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(savings.router, prefix="/api")
app.include_router(budget.router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True)
