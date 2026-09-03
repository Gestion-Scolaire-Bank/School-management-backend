from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "timetable-service"
    port: int = 8093
    database_url: str = "postgresql://schoolmanage:schoolmanage_dev_pwd@localhost:5432/sm_timetable_db"
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""


settings = Settings()
