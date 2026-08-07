from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "reportcard-service"
    port: int = 8086
    database_url: str = "postgresql://schoolmanage:schoolmanage_dev_pwd@localhost:5432/sm_reportcard_db"
    kafka_broker: str = "localhost:9092"
    redis_host: str = "localhost"
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "schoolmanage"
    minio_secret_key: str = "schoolmanage_dev_pwd"
    minio_bucket: str = "sm-reportcard-dev"
    admin_service_url: str = "http://admin-service:8092"
    registration_service_url: str = "http://registration-service:8082"


settings = Settings()
