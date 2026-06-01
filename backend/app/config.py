from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://starfire:starfire@localhost:5432/starfire"
    secret_key: str = "dev-secret-key"

    model_config = {"env_file": ".env"}


settings = Settings()
