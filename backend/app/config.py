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
    # 🆕 "meta" is production default. "evolution" is for local testing only (Baileys/Evolution API).
    active_channel: str = "meta"
    evolution_base_url: str = "http://evolution:8080"
    evolution_api_key: str | None = None
    # Shared secret that Evolution must send with every webhook call
    # (header "X-Webhook-Secret" or query string "?token="). Required in production.
    evolution_webhook_secret: str | None = None
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    @property
    def cors_list(self):
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

@lru_cache
def get_settings(): return Settings()


_WEAK_SECRETS = {"", "change-me", "changeme", "secret"}


def validate_production_settings(s: Settings) -> list[str]:
    """Return a list of problems that make the config unsafe for production.

    Called at startup. In production any problem aborts boot, so a forgotten
    .env value can never silently expose the API or the webhooks.
    """
    problems: list[str] = []
    jwt = s.dashboard_jwt_secret or ""
    if jwt.lower() in _WEAK_SECRETS or jwt.lower().startswith("change-me") or len(jwt) < 32:
        problems.append("DASHBOARD_JWT_SECRET must be a random value of at least 32 characters")
    if s.active_channel == "evolution":
        if not s.evolution_webhook_secret:
            problems.append("EVOLUTION_WEBHOOK_SECRET is required when ACTIVE_CHANNEL=evolution")
        if not s.evolution_api_key:
            problems.append("EVOLUTION_API_KEY is required when ACTIVE_CHANNEL=evolution")
    elif s.active_channel == "meta":
        if not s.whatsapp_app_secret:
            problems.append("WHATSAPP_APP_SECRET is required when ACTIVE_CHANNEL=meta")
        if (s.whatsapp_webhook_verify_token or "").lower() in _WEAK_SECRETS:
            problems.append("WHATSAPP_WEBHOOK_VERIFY_TOKEN must not be the default")
    else:
        problems.append("ACTIVE_CHANNEL must be 'meta' or 'evolution'")
    return problems
