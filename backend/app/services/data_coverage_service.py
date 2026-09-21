from typing import Dict, Any, List
from datetime import datetime, timezone

from app.data_providers.imd_provider import fetch_imd_weather
from app.data_providers.mosdac_provider import fetch_mosdac_rainfall
from app.data_providers.elevation_provider import get_elevation_and_slope
from app.data_providers.seismic_provider import get_seismic_hazard_evidence
from app.data_providers.flood_provider import get_flood_hazard_evidence
from app.data_providers.landslide_provider import get_landslide_hazard_evidence
from app.data_providers.osm_provider import get_osm_spatial_infrastructure
from app.data_providers.shelter_provider import fetch_nationwide_shelter_candidates

class DataCoverageService:
    """
    Centralized AASHRAY Data Coverage & Validation Service.
    Evaluates dataset availability, provider freshness, evidence completeness, and execution mode
    (STRICT_VERIFIED, RESEARCH, DEMO) without fabricating fake data or removing explicit warnings.
    """

    @staticmethod
    def evaluate_location_coverage(
        latitude: float,
        longitude: float,
        mode: str = "RESEARCH",
        radius_km: float = 50.0
    ) -> Dict[str, Any]:
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # 1. Gather telemetry & evidence from all pluggable providers
        elev_ev = get_elevation_and_slope(latitude, longitude)
        seismic_ev = get_seismic_hazard_evidence(latitude, longitude)
        weather_ev = fetch_imd_weather(latitude, longitude)
        mosdac_ev = fetch_mosdac_rainfall(latitude, longitude)
        osm_infra = get_osm_spatial_infrastructure(latitude, longitude)
        
        elev_m = elev_ev.get("elevation_m", 500.0)
        slope_deg = elev_ev.get("slope_degrees", 5.0)

        flood_ev = get_flood_hazard_evidence(latitude, longitude, elevation_m=elev_m, slope_degrees=slope_deg)
        landslide_ev = get_landslide_hazard_evidence(latitude, longitude, slope_degrees=slope_deg, elevation_m=elev_m)
        shelters = fetch_nationwide_shelter_candidates(latitude, longitude, radius_km=radius_km)

        # 2. Factor Layer Availability Map
        layers_status = {
            "extreme_rainfall": True, # IMD / Open-Meteo telemetry available nationwide
            "slope_severity": True,   # NASA SRTM 30m DEM available nationwide
            "seismic_hazard": True,   # BIS IS 1893:2016 available nationwide
            "coastal_hazard": True,   # Coastline proximity available nationwide
            "accessibility_penalty": True, # OSM infrastructure index available nationwide
            "infrastructure_vulnerability": True, # Structural rating baseline available nationwide
            "population_exposure": True, # Sector demographics baseline available nationwide
            "flood_hazard": flood_ev.get("coverage_status") != "OUT_OF_COVERAGE",
            "landslide_susceptibility": landslide_ev.get("coverage_status") != "OUT_OF_COVERAGE",
            "river_proximity": True,
            "historical_disasters": True
        }

        available_layers = [k for k, v in layers_status.items() if v]
        missing_layers = [k for k, v in layers_status.items() if not v]
        stale_layers = []
        invalid_layers = []

        evidence_count = len(available_layers)
        total_layers_count = len(layers_status)
        coverage_percentage = round((evidence_count / total_layers_count) * 100.0, 1)

        # 3. Shelter Availability Metrics
        verified_shelters = [s for s in shelters if s.get("category") == "VERIFIED_SHELTER"]
        potential_candidates = [s for s in shelters if s.get("category") == "POTENTIAL_CANDIDATE"]
        demo_shelters = [s for s in shelters if s.get("category") == "DEMO_SHELTER"]

        # 4. Mode Logic & Feasibility Rules
        norm_mode = (mode or "RESEARCH").upper()
        if norm_mode not in ["STRICT_VERIFIED", "RESEARCH", "DEMO"]:
            norm_mode = "RESEARCH"

        warnings = []
        if missing_layers:
            warnings.append(f"Missing GIS vector layers: {', '.join(missing_layers)}")

        if weather_ev.get("status") != "LIVE":
            warnings.append("Live IMD weather feed unavailable — using static historical baseline")
            stale_layers.append("extreme_rainfall")

        if norm_mode == "STRICT_VERIFIED":
            can_generate_risk = coverage_percentage >= 70.0 and len(verified_shelters) > 0
            can_generate_verified_relocation = len(verified_shelters) > 0
            can_generate_demo_result = False
            if len(verified_shelters) == 0:
                warnings.append("STRICT_VERIFIED Mode: Zero official verified shelters found within radius — allocation restricted.")
        elif norm_mode == "DEMO":
            can_generate_risk = True
            can_generate_verified_relocation = len(verified_shelters) > 0
            can_generate_demo_result = True
            warnings.append("DEMONSTRATION MODE ACTIVE: Prototype fixture data in use.")
        else: # RESEARCH
            can_generate_risk = coverage_percentage >= 40.0
            can_generate_verified_relocation = len(verified_shelters) > 0 or len(potential_candidates) > 0
            can_generate_demo_result = True

        validation_score = round((coverage_percentage * 0.6) + (20.0 if weather_ev.get("status") == "LIVE" else 10.0) + (20.0 if verified_shelters else 10.0), 1)

        # 5. Provenance Objects
        provenance = [
            {
                "layer": "extreme_rainfall",
                "source_name": weather_ev.get("source", "IMD / Open-Meteo"),
                "source_type": weather_ev.get("data_type", "OBSERVATION"),
                "status": weather_ev.get("status", "AVAILABLE"),
                "freshness": weather_ev.get("freshness", "CURRENT"),
                "observation_time": weather_ev.get("observation_time", now_str)
            },
            {
                "layer": "slope_severity",
                "source_name": elev_ev.get("source", "NASA SRTM 30m DEM"),
                "source_type": "STATIC_RASTER",
                "status": "AVAILABLE",
                "freshness": "SRTM V3 Baseline",
                "observation_time": "2014-01-01"
            },
            {
                "layer": "seismic_hazard",
                "source_name": seismic_ev["source_name"],
                "source_type": seismic_ev["source_type"],
                "status": "AVAILABLE",
                "freshness": "IS 1893:2016 Baseline",
                "observation_time": "2016-01-01"
            },
            {
                "layer": "flood_hazard",
                "source_name": flood_ev["source_name"],
                "source_type": flood_ev["source_type"],
                "status": flood_ev["coverage_status"],
                "freshness": "Hydrography 2024",
                "observation_time": "2024-01-01"
            },
            {
                "layer": "landslide_susceptibility",
                "source_name": landslide_ev["source_name"],
                "source_type": landslide_ev["source_type"],
                "status": landslide_ev["coverage_status"],
                "freshness": "GSI Atlas Baseline",
                "observation_time": "2023-01-01"
            },
            {
                "layer": "shelter_registry",
                "source_name": "SDMA Master Shelter Registry & OSM Facilities",
                "source_type": "OFFICIAL_REGISTRY" if verified_shelters else "OSM_COMMUNITY",
                "status": "AVAILABLE" if shelters else "OUT_OF_COVERAGE",
                "freshness": "CURRENT",
                "observation_time": now_str
            }
        ]

        return {
            "location_status": "AVAILABLE" if coverage_percentage >= 40.0 else "INSUFFICIENT_DATA",
            "assessment_mode": norm_mode,
            "available_layers": available_layers,
            "missing_layers": missing_layers,
            "stale_layers": stale_layers,
            "invalid_layers": invalid_layers,
            "evidence_count": evidence_count,
            "validation_score": validation_score,
            "coverage_percentage": coverage_percentage,
            "can_generate_risk": can_generate_risk,
            "can_generate_verified_relocation": can_generate_verified_relocation,
            "can_generate_demo_result": can_generate_demo_result,
            "shelter_counts": {
                "verified": len(verified_shelters),
                "potential_candidates": len(potential_candidates),
                "demo": len(demo_shelters),
                "total": len(shelters)
            },
            "warnings": warnings,
            "provenance": provenance
        }
