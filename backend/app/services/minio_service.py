import io
import logging
from datetime import timedelta

from minio import Minio
from minio.error import S3Error

from app.config import settings

logger = logging.getLogger(__name__)


class MinioService:
    def __init__(self):
        self._client: Minio | None = None

    @property
    def client(self) -> Minio:
        if self._client is None:
            self._client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure,
            )
        return self._client

    def ensure_buckets(self) -> None:
        for bucket in [settings.bucket_documents, settings.bucket_images]:
            try:
                if not self.client.bucket_exists(bucket):
                    self.client.make_bucket(bucket)
                    logger.info("Created bucket: %s", bucket)
            except S3Error as e:
                logger.error("Failed to create bucket %s: %s", bucket, e)

    def upload_file(
        self,
        bucket: str,
        object_name: str,
        content: bytes,
        content_type: str,
    ) -> str:
        self.client.put_object(
            bucket,
            object_name,
            io.BytesIO(content),
            length=len(content),
            content_type=content_type,
        )
        return object_name

    def get_presigned_url(self, bucket: str, object_name: str, expires_hours: int = 1) -> str:
        return self.client.presigned_get_object(
            bucket,
            object_name,
            expires=timedelta(hours=expires_hours),
        )

    def get_file(self, bucket: str, object_name: str) -> tuple[bytes, str | None]:
        response = self.client.get_object(bucket, object_name)
        try:
            data = response.read()
            content_type = response.headers.get("Content-Type")
            return data, content_type
        finally:
            response.close()
            response.release_conn()

    def delete_file(self, bucket: str, object_name: str) -> None:
        try:
            self.client.remove_object(bucket, object_name)
        except S3Error as e:
            logger.error("Failed to delete %s/%s: %s", bucket, object_name, e)


minio_service = MinioService()
