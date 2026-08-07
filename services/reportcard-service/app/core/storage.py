import io
from urllib.parse import urlparse

from minio import Minio

from app.core.config import settings


class ReportCardStorage:
    """Encapsule l'acces a MinIO/S3 pour les bulletins PDF generes."""

    def __init__(self, endpoint: str, access_key: str, secret_key: str, bucket: str):
        parsed = urlparse(endpoint)
        self._client = Minio(
            parsed.netloc or endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=parsed.scheme == "https",
        )
        self._bucket = bucket
        self._public_endpoint = endpoint.rstrip("/")

    def _ensure_bucket(self) -> None:
        if not self._client.bucket_exists(self._bucket):
            self._client.make_bucket(self._bucket)

    def upload(self, object_name: str, data: bytes, content_type: str = "application/pdf") -> str:
        self._ensure_bucket()
        self._client.put_object(
            self._bucket,
            object_name,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return f"{self._public_endpoint}/{self._bucket}/{object_name}"

    def download(self, object_name: str) -> bytes:
        response = self._client.get_object(self._bucket, object_name)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()


def get_storage() -> ReportCardStorage:
    return ReportCardStorage(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        bucket=settings.minio_bucket,
    )
