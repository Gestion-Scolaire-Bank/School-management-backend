from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import router
from app.core.database import Base, engine
from app.models import grade, report_card  # noqa: F401 - enregistre les modeles aupres de Base.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="reportcard-service",
    description="Gere la saisie des notes par matiere et par periode, le calcul automatique des moyennes et des rangs, ainsi que la generation des bulletins au format ",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health():
    return {"status": "UP", "service": "reportcard-service"}
