import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Featherless AI — loaded from environment variables
    FEATHERLESS_API_KEY: str = ""
    FEATHERLESS_BASE_URL: str = "https://api.featherless.ai/v1"
    MODEL_ID: str = "Qwen/Qwen2.5-32B-Instruct"

    # Neo4j Aura — loaded from environment variables
    NEO4J_URI: str = ""
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = ""
    NEO4J_DATABASE: str = "neo4j"

    # CORS — allow localhost + production deployments
    CORS_ORIGINS: list[str] = [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://*.railway.app",
        "https://*.render.com",
    ]

    class Config:
        env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        # On Vercel, this .env file won't exist, and that's fine —
        # Vercel injects env vars directly into the process environment.


settings = Settings()
