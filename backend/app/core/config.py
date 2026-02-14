from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Teacher-Tutor AI"
    API_V1_STR: str = "/api/v1"
    
    # Moodle Settings
    MOODLE_URL: str
    MOODLE_TOKEN: Optional[str] = None
    ENABLE_MOCK_MOODLE: bool = False
    
    # AI Settings
    LLM_PROVIDER: str = "ollama"  # options: "ollama", "mistral_api", "groq"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    MISTRAL_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    MODEL_NAME: str = "mistral"

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"


settings = Settings()
print(f"DEBUG: Loaded MOODLE_URL={settings.MOODLE_URL}")
print(f"DEBUG: Loaded ENABLE_MOCK_MOODLE={settings.ENABLE_MOCK_MOODLE}")
