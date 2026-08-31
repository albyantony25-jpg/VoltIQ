from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
from pydantic import Field, field_validator, model_validator

class Settings(BaseSettings):
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    # Anon (public) key — used for per-request JWT verification via /auth/v1/user.
    # Must be set in env. The service key above must NOT be used in auth headers.
    SUPABASE_ANON_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    JWT_SECRET: str
    ALLOWED_ORIGINS: str | List[str] = "http://localhost:3000"
    cors_origins: List[str] = []

    @model_validator(mode="after")
    def populate_cors_origins(self):
        if isinstance(self.ALLOWED_ORIGINS, str):
            self.cors_origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        elif isinstance(self.ALLOWED_ORIGINS, list):
            self.cors_origins = self.ALLOWED_ORIGINS
        return self

    model_config = SettingsConfigDict(
        env_file=None,
        env_file_encoding="utf-8"
    )

settings = Settings()
