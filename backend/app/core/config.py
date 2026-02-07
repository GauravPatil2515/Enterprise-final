import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Featherless AI — loaded from .env (no hardcoded secrets)
    FEATHERLESS_API_KEY: str = ""
    FEATHERLESS_BASE_URL: str = "https://api.featherless.ai/v1"
    MODEL_ID: str = "Qwen/Qwen2.5-32B-Instruct"

    # Neo4j Aura — loaded from .env
    NEO4J_URI: str = ""
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = ""
    NEO4J_DATABASE: str = "neo4j"

    # CORS — restrict to known frontend origins
    CORS_ORIGINS: list = [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    class Config:
        env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")


settings = Settings()
