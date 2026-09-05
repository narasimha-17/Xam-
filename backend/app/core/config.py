from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://lms:lms@localhost:5432/lms"
    sync_database_url: str = "postgresql+psycopg2://lms:lms@localhost:5432/lms"

    @field_validator("database_url")
    @classmethod
    def _ensure_async_driver(cls, v: str) -> str:
        # Managed Postgres providers (Neon, Render, Railway, etc.) hand out a plain
        # postgresql:// URL — the async engine needs the asyncpg driver explicitly.
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)

        # asyncpg's connect() doesn't understand libpq-style `sslmode`/`channel_binding`
        # query params (unlike psycopg2) — translate sslmode into asyncpg's own `ssl`
        # param and drop channel_binding, which asyncpg negotiates on its own.
        parts = urlsplit(v)
        query = parse_qs(parts.query)
        if "sslmode" in query:
            query["ssl"] = query.pop("sslmode")
        query.pop("channel_binding", None)
        return urlunsplit(parts._replace(query=urlencode(query, doseq=True)))

    @field_validator("sync_database_url")
    @classmethod
    def _ensure_sync_driver(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    firebase_service_account_json: str = ""

    upload_dir: str = "uploads/pdfs"
    discussion_image_dir: str = "uploads/discussion_images"
    feedback_image_dir: str = "uploads/feedback_images"
    cors_origins: str = "http://localhost:5173"
    frontend_url: str = "http://localhost:5173"

    seed_admin_email: str = "admin@example.com"
    seed_admin_name: str = "Admin"

    jdoodle_client_id: str = ""
    jdoodle_client_secret: str = ""

    judge0_url: str = ""
    judge0_api_key: str = ""

    brevo_api_key: str = ""
    email_from_address: str = ""

    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:14b"
    ai_features_enabled: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
