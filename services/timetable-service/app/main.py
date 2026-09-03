from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import router
from app.core.database import Base, engine
import app.models.timetable  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="timetable-service",
    description="Emploi du temps - gestion des creneaux (ClassTime), pauses (BreakTime), conges (Holiday) et occurrences - porte du kernel TimeTables de wyscolars",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
def health():
    return {"status": "UP", "service": "timetable-service"}


@app.get("/")
def root():
    return {"service": "timetable-service", "status": "UP"}
