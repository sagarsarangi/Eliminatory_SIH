import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from app.core.config import settings
from app.core.state import ml_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models at startup."""
    try:
        from app.models.tabular import load_rf_model

        ml_models["rf"] = load_rf_model()
        print("[Startup] Random Forest model loaded.")
    except Exception as e:
        print(f"[Startup] RF model not found, skipping: {e}")

    try:
        from app.models.image import load_cnn_model

        ml_models["cnn"] = load_cnn_model()
        print("[Startup] CNN model loaded.")
    except Exception as e:
        print(f"[Startup] CNN model not found, skipping: {e}")

    yield

    ml_models.clear()


app = FastAPI(
    title="MooSense API",
    description="AI-Enabled Bovine Mastitis Forecasting System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "MooSense API",
        "models_loaded": list(ml_models.keys()),
    }


# Import and include routers
from app.routers import ingest, cows, map, alerts, explain

app.include_router(ingest.router, prefix="/api")
app.include_router(cows.router, prefix="/api")
app.include_router(map.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(explain.router, prefix="/api")
