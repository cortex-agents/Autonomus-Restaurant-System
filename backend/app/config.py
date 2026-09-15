from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    environment: str = "development"
    log_level: str = "INFO"
    database_url: str = "postgresql+asyncpg://restaurant:restaurant@postgres:5432/restaurant"
    redis_url: str = "redis://redis:6379/0"
    dashboard_jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    jwt_refresh_grace_minutes: int = 10
    whatsapp_access_token: str | None = None
    whatsapp_app_secret: str | None = None
    whatsapp_webhook_verify_token: str = "change-me"
    whatsapp_api_version: str = "v20.0"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    cors_origins: str = "http://localhost:3000"
    owner_accounts_file: str = "/data/owner_accounts.json"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_list(self):
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

@lru_cache
def get_settings(): return Settings()