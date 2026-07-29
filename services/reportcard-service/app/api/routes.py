from fastapi import APIRouter, HTTPException

router = APIRouter()

# Routes reportcard-service - extraites du document de conception (section 5.2)

@router.post("/api/v1/reports/grades")
def saisir_une_note():
    """Roles autorises : Enseignant. TODO : Saisir une note."""
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/api/v1/reports/generate")
def generer_les_bulletins_d_une_classe_periode():
    """Roles autorises : Admin. TODO : Generer les bulletins d'une classe/periode."""
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/api/v1/reports/student/{id}")
def consulter_telecharger_le_bulletin():
    """Roles autorises : Parent / Eleve. TODO : Consulter / telecharger le bulletin."""
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/api/v1/reports/class/{id}/summary")
def statistiques_de_classe():
    """Roles autorises : Enseignant / Admin. TODO : Statistiques de classe."""
    raise HTTPException(status_code=501, detail="Not implemented")

