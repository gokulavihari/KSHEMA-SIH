import os

class Settings:
    PROJECT_NAME: str = "AASHRAY - Disaster Management & Relocation Decision Support System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    PILOT_REGION: str = "Chamoli District, Uttarakhand"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./aashray.db")
    CORS_ORIGINS: list = ["*"]
    
    # Default Configurable Multi-Hazard Risk Component Weights
    DEFAULT_WEIGHTS: dict = {
        "flood_hazard": 0.20,
        "landslide_susceptibility": 0.18,
        "extreme_rainfall": 0.12,
        "slope_severity": 0.10,
        "river_proximity": 0.08,
        "historical_disasters": 0.10,
        "population_exposure": 0.08,
        "infrastructure_vulnerability": 0.07,
        "accessibility_penalty": 0.07
    }

settings = Settings()
