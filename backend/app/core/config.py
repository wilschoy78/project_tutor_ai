from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Teacher-Tutor AI"
    API_V1_STR: str = "/api/v1"
    
    # Moodle Settings
    MOODLE_URL: str
    MOODLE_TOKEN: Optional[str] = None
    USE_MOCK_MOODLE: bool = True
    
    # AI Settings
    LLM_PROVIDER: str = "ollama"  # options: "ollama", "mistral_api", "groq"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    MISTRAL_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    MODEL_NAME: str = "mistral"

    class Config:
        env_file = "/Users/wilson/Desktop/2025/MIT_CIT/2026/projects/backend/.env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"


settings = Settings()
print(f"DEBUG: Loaded MOODLE_URL={settings.MOODLE_URL}")
print(f"DEBUG: Loaded USE_MOCK_MOODLE={settings.USE_MOCK_MOODLE}")
