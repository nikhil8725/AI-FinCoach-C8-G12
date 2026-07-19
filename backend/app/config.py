"""Application settings, loaded from environment / backend/.env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openrouter_api_key: str = ""
    fast_model: str = "google/gemini-3.1-flash-lite"
    smart_model: str = "anthropic/claude-sonnet-5"
    fallback_model: str = "qwen/qwen3.7-plus"

    cors_origin: str = "http://localhost:5173"
    database_url: str = "sqlite:///./fincoach.db"
    chroma_dir: str = "./chroma_data"
    uploads_dir: str = "./uploads"
    log_dir: str = "./logs"

    max_llm_calls_per_run: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()
