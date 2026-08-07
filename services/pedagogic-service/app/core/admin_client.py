from typing import Any, Optional

import httpx

from app.core.config import settings


class AdminResourceNotFound(Exception):
    """La classe/matiere referencee n'existe pas aupres d'admin-service."""


class AdminServiceUnavailable(Exception):
    """admin-service est injoignable - on ne peut pas valider la reference."""


class AdminServiceClient:
    """Valide les references vers les donnees de reference d'admin-service (classe,
    matiere, affectation enseignant) avant d'accepter un cours/une ressource - remplace la
    confiance aveugle accordee jusqu'ici a class_level/subject en texte libre (memes
    incoherences que celles corrigees dans reportcard-service)."""

    def __init__(self, base_url: str):
        self._base_url = base_url

    def get_class(self, class_id: str) -> dict:
        return self._get(f"/api/v1/admin/classes/{class_id}")

    def get_subject(self, subject_id: str) -> dict:
        return self._get(f"/api/v1/admin/subjects/{subject_id}")

    def list_teacher_assignments(self, class_id: str) -> list[dict]:
        return self._get("/api/v1/admin/teacher-assignments", params={"classId": class_id})

    def _get(self, path: str, params: Optional[dict] = None) -> Any:
        try:
            response = httpx.get(f"{self._base_url}{path}", params=params, timeout=5.0)
        except httpx.HTTPError as e:
            raise AdminServiceUnavailable(f"admin-service injoignable ({path}) : {e}") from e
        if response.status_code == 404:
            raise AdminResourceNotFound(f"Ressource introuvable aupres d'admin-service : {path}")
        response.raise_for_status()
        return response.json()


def get_admin_client() -> AdminServiceClient:
    return AdminServiceClient(base_url=settings.admin_service_url)
