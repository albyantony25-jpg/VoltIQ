from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o"
    JWT_SECRET: str
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = SettingsConfigDict(
    env_file=".env" if __import__('os').path.exists(".env") else None,
    env_file_encoding="utf-8"
    )

settings = Settings()
