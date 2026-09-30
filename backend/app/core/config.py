import os

class Settings:
    PROJECT_NAME: str = "Kshema — Disaster Risk & Safe Relocation Intelligence"
    VERSION: str = "2.1.0"
    PILOT_REGION: str = "Garhwal Himalayan Belt, Uttarakhand"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./aashray.db")
    CORS_ORIGINS: list = ["*"]
    
    # Location-Agnostic System Configuration
    SYSTEM_CONFIG: dict = {
        "default_region": None,
        "supported_regions": ["Chamoli District, Uttarakhand", "Garhwal Himalayan Belt, Uttarakhand"],
        "data_coverage_mode": "verified_only",
        "allow_demo_data": False,
        "require_source_metadata": True,
        "require_coordinates": True,
        "require_capacity_for_relocation": True,
        "minimum_data_quality_score": 0.70
    }
    
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

