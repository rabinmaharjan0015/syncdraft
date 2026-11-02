from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://syncdraft:change-me-local@localhost:5432/syncdraft"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:5173"
    jwt_secret: str = "development-only-change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    collaboration_url: str = "ws://localhost:1234"
    collaboration_ticket_seconds: int = 90
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
