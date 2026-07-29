from fastapi import APIRouter, HTTPException

router = APIRouter()

# Routes schoolid-service - extraites du document de conception (section 5.2)

@router.post("/api/v1/school-id/generate")
def generer_une_carte_id():
    """Roles autorises : Systeme (interne). TODO : Generer une carte ID."""
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/api/v1/school-id/{studentId}/reissue")
def renouveler_une_carte_id():
    """Roles autorises : Admin. TODO : Renouveler une carte ID."""
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/api/v1/school-id/{studentId}")
def telecharger_la_carte_id():
    """Roles autorises : Parent / Admin. TODO : Telecharger la carte ID."""
    raise HTTPException(status_code=501, detail="Not implemented")

