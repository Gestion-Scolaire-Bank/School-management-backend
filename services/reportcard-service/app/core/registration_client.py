import httpx

from app.core.config import settings


class RegistrationServiceClient:
    """Resout le nom d'un eleve a partir de son student_id (identifiant de son dossier
    d'inscription) - la synthese de classe n'affichait jusqu'ici que cet UUID brut, illisible
    pour un enseignant/administrateur (cf. point de coherence). Best-effort volontairement :
    une panne de registration-service degrade l'affichage (UUID brut) plutot que de faire
    echouer toute la synthese."""

    def __init__(self, base_url: str):
        self._base_url = base_url

    def list_by_class(self, class_id: str) -> list[dict]:
        response = httpx.get(f"{self._base_url}/api/v1/registrations/class/{class_id}", timeout=5.0)
        response.raise_for_status()
        return response.json()


def get_registration_client() -> RegistrationServiceClient:
    return RegistrationServiceClient(base_url=settings.registration_service_url)
