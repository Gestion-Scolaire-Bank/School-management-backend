from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import router
from app.core.consumer import start_consumer_task
from app.core.database import Base, engine
from app.models import school_id_card  # noqa: F401 - enregistre le modele aupres de Base.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    task = start_consumer_task()
    yield
    task.cancel()


app = FastAPI(
    title="schoolid-service",
    description="Genere automatiquement les cartes d'identite scolaires avec QR code integre et photo, a la suite d'une inscription validee. Gere egalement le renouvel",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health():
    return {"status": "UP", "service": "schoolid-service"}
