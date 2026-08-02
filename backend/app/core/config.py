from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://lms:lms@localhost:5432/lms"
    sync_database_url: str = "postgresql+psycopg2://lms:lms@localhost:5432/lms"

    @field_validator("database_url")
    @classmethod
    def _ensure_async_driver(cls, v: str) -> str:
        # Managed Postgres providers (Render, Railway, etc.) hand out a plain
        # postgresql:// URL — the async engine needs the asyncpg driver explicitly.
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("sync_database_url")
    @classmethod
    def _ensure_sync_driver(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    jwt_secret_key: str = "change-me-to-a-random-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    upload_dir: str = "uploads/pdfs"
    cors_origins: str = "http://localhost:5173"
    frontend_url: str = "http://localhost:5173"

    seed_admin_email: str = "admin@example.com"
    seed_admin_password: str = "changeme123"
    seed_admin_name: str = "Admin"

    jdoodle_client_id: str = ""
    jdoodle_client_secret: str = ""

    judge0_url: str = ""
    judge0_api_key: str = ""

    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:14b"
    ai_features_enabled: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
