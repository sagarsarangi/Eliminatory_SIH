import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root
env_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    # Supabase
    SUPABASE_URL: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Groq
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # TextBee
    TEXTBEE_API_KEY: str = os.getenv("TEXTBEE_API_KEY", "")
    TEXTBEE_DEVICE_ID: str = os.getenv("TEXTBEE_DEVICE_ID", "")

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")

    # ML Artifacts
    ML_ARTIFACTS_DIR: str = str(
        Path(__file__).resolve().parents[2] / "ml" / "artifacts"
    )

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()
