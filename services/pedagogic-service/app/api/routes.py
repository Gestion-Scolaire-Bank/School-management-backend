from fastapi import APIRouter, HTTPException

router = APIRouter()

# Routes pedagogic-service - extraites du document de conception (section 5.2)

@router.post("/api/v1/pedagogic/resources")
def uploader_une_ressource():
    """Roles autorises : Enseignant. TODO : Uploader une ressource."""
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/api/v1/pedagogic/resources")
def lister_les_ressources_disponibles():
    """Roles autorises : Enseignant. TODO : Lister les ressources disponibles."""
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/api/v1/pedagogic/courses")
def creer_un_cours_plan_de_lecon():
    """Roles autorises : Enseignant. TODO : Creer un cours / plan de lecon."""
    raise HTTPException(status_code=501, detail="Not implemented")

