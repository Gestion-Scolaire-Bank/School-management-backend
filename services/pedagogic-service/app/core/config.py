from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "pedagogic-service"
    port: int = 8089
    database_url: str = "postgresql://schoolmanage:schoolmanage_dev_pwd@localhost:5432/sm_pedagogic_db"
    kafka_broker: str = "localhost:9092"
    redis_host: str = "localhost"
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "schoolmanage"
    minio_secret_key: str = "schoolmanage_dev_pwd"
    minio_bucket: str = "sm-pedagogic-dev"
    admin_service_url: str = "http://admin-service:8092"


settings = Settings()
