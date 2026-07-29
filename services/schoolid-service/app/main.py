from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="schoolid-service",
    description="Genere automatiquement les cartes d'identite scolaires avec QR code integre et photo, a la suite d'une inscription validee. Gere egalement le renouvel",
    version="1.0.0",
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "UP", "service": "schoolid-service"}
