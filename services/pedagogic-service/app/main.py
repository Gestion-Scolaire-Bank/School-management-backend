from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="pedagogic-service",
    description="Centralise la bibliotheque de ressources pedagogiques : documents, videos, plans de cours et outils d'evaluation destines aux enseignants. Les fichier",
    version="1.0.0",
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "UP", "service": "pedagogic-service"}
