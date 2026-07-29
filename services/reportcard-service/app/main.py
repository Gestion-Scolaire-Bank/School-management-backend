from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="reportcard-service",
    description="Gere la saisie des notes par matiere et par periode, le calcul automatique des moyennes et des rangs, ainsi que la generation des bulletins au format ",
    version="1.0.0",
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "UP", "service": "reportcard-service"}
