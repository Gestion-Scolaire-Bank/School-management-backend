from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="analytics-service",
    description="Agrege les donnees de tous les services metier (paiements, presence, notes) pour alimenter les tableaux de bord des directeurs et de l'administrateur ",
    version="1.0.0",
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "UP", "service": "analytics-service"}
