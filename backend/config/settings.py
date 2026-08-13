from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    brightdata_api_key: str = ""

    # AI Provider: "groq", "gemini", or "anthropic"
    ai_provider: str = "groq"
    groq_keys: str = ""  # comma-separated list for rotation
    groq_api_key: str = ""
    grok_api_key: str = ""  # alias
    gemini_api_key: str = ""
    anthropic_api_key: str = ""

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "precog_password"

    redis_url: str = "redis://localhost:6379"

    scraper_interval_minutes: int = 15
    prediction_confidence_threshold: float = 0.6

    class Config:
        env_file = "../.env"
        extra = "ignore"


settings = Settings()
