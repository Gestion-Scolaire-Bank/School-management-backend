from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "schoolid-service"
    port: int = 8090
    database_url: str = "postgresql://schoolmanage:schoolmanage_dev_pwd@localhost:5432/sm_schoolid_db"
    kafka_broker: str = "localhost:9092"
    redis_host: str = "localhost"
    sm_gateway_url: str = "http://sm-gateway-service:8888"


settings = Settings()
