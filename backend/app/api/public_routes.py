from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional

from app.services.data_seed import (
    RAW_HABITATIONS, RAW_CANDIDATE_SITES, DATA_SOURCES, INITIAL_ALERTS
)
from app.services.hazard_engine import calculate_hazard_scores
from app.services.risk_engine import calculate_habitation_risk

router = APIRouter(prefix="/public", tags=["Public General Viewer"])

@router.get("/dashboard")
def get_public_dashboard_data():
    """
    Provides aggregated, public-safe disaster risk overview for the general public interface.
    Excludes sensitive infrastructure details, internal model weights, database diagnostics, or administrative controls.
    """
    evaluated_habitations = []
    high_extreme_count = 0
    
    for hab in RAW_HABITATIONS:
        risk = calculate_habitation_risk(hab, rainfall_multiplier=1.0)
        risk_level = risk["risk_level"]
        if risk_level in ["CRITICAL", "HIGH", "EXTREME"]:
            high_extreme_count += 1
            
        evaluated_habitations.append({
            "id": hab["id"],
            "name": hab["name"],
            "district": hab.get("subdistrict", "Chamoli"),
            "state": hab.get("state", "Uttarakhand"),
            "population": hab.get("population", 0),
            "risk_score": round(risk["risk_score"], 2),
            "risk_level": risk_level,
            "safety_recommendation": "Maintain vigilance and follow local district emergency guidance." if risk_score_is_high(risk_level) else "Normal monitoring."
        })

    public_alerts = [
        {
            "id": alert["id"],
            "title": alert.get("title", alert.get("location", "Emergency Alert")),
            "severity": alert["severity"],
            "affected_area": alert.get("affected_area", alert.get("location", "Pilot Region")),
            "issued_at": alert.get("issued_at", alert.get("timestamp", "2026-09-20 08:00")),
            "guidance": alert.get("guidance", alert.get("message", "Follow local administration instructions."))
        }
        for alert in INITIAL_ALERTS if alert.get("status") != "RESOLVED"
    ]

    hazard_distribution = {
        "CRITICAL": sum(1 for h in evaluated_habitations if h["risk_level"] == "CRITICAL"),
        "HIGH": sum(1 for h in evaluated_habitations if h["risk_level"] == "HIGH"),
        "MEDIUM": sum(1 for h in evaluated_habitations if h["risk_level"] == "MEDIUM"),
        "LOW": sum(1 for h in evaluated_habitations if h["risk_level"] == "LOW")
    }

    return {
        "system_name": "Kshema — Disaster Risk & Safe Relocation Intelligence System",
        "interface": "PUBLIC_VIEWER",
        "total_monitored_habitations": len(RAW_HABITATIONS),
        "high_risk_habitations_count": high_extreme_count,
        "hazard_distribution": hazard_distribution,
        "active_public_alerts": public_alerts,
        "public_safety_summary": "Kshema continuously monitors landslide, flood, and seismic hazards to ensure public safety in vulnerable regions.",
        "habitations_overview": evaluated_habitations
    }

def risk_score_is_high(level: str) -> bool:
    return level in ["CRITICAL", "HIGH", "EXTREME"]

@router.get("/map")
def get_public_map_data(
    search: Optional[str] = Query(None, description="Location search query")
):
    """
    Returns public GIS map layers (habitations, simplified risk categories, safety guidance).
    Coordinates are provided for rendering, but UI presents location names, districts, and states.
    """
    features = []
    for hab in RAW_HABITATIONS:
        if search:
            query = search.lower()
            if not (query in hab["name"].lower() or query in hab.get("subdistrict", "").lower() or query in hab.get("state", "").lower()):
                continue

        risk = calculate_habitation_risk(hab)

        features.append({
            "id": hab["id"],
            "name": hab["name"],
            "district": hab.get("subdistrict", "Chamoli"),
            "state": hab.get("state", "Uttarakhand"),
            "latitude": hab["latitude"],
            "longitude": hab["longitude"],
            "population": hab.get("population", 0),
            "risk_score": round(risk["risk_score"], 2),
            "risk_level": risk["risk_level"],
            "public_safety_guidance": f"Keep emergency contacts ready. Stay informed via regional alerts." if risk["risk_level"] in ["CRITICAL", "HIGH"] else "Safe under current weather conditions."
        })

    return {
        "interface": "PUBLIC_GIS_MAP",
        "features": features,
        "total_locations": len(features)
    }

@router.get("/alerts")
def get_public_alerts():
    """Returns active public emergency alerts."""
    return {
        "alerts": [
            {
                "id": a["id"],
                "title": a.get("title", a.get("location", "Emergency Alert")),
                "severity": a["severity"],
                "message": a.get("message", "Emergency alert issued for public safety."),
                "affected_region": a.get("affected_area", a.get("location", "Pilot Region")),
                "issued_at": a.get("issued_at", a.get("timestamp", "2026-09-20 08:00"))
            }
            for a in INITIAL_ALERTS
        ]
    }

@router.get("/safety-info")
def get_public_safety_info():
    """Provides public safety protocols, emergency guidelines, and helpline information."""
    return {
        "helpline_numbers": [
            {"name": "National Disaster Response Force (NDRF)", "number": "011-24363260"},
            {"name": "Uttarakhand State Emergency Operation Center", "number": "1070 / 0135-2710334"},
            {"name": "Chamoli District Control Room", "number": "01372-251437"},
            {"name": "Emergency Services", "number": "112"}
        ],
        "guidance_steps": [
            "Monitor official weather and landslide alert bulletins issued by Kshema and IMD.",
            "In case of intense rainfall (>50mm/hr), avoid steep slope dwellings and dry riverbeds.",
            "Identify designated safe shelter sites in your district.",
            "Keep an emergency kit ready with essential documents, medicines, flashlight, and warm clothing."
        ],
        "about_kshema": "Kshema (क्षेम) is a disaster risk and safe relocation intelligence platform developed for SDMA/NDRF/MHA."
    }

@router.get("/location/search")
def search_public_location(
    q: str = Query(..., description="Location search query (e.g., Medchal, Kullu, Chamoli, Hyderabad)")
):
    """
    Public Endpoint: Searches for matching locations across India for location selection.
    Returns structured results containing Place name, District, State, and coordinates.
    """
    from fastapi import HTTPException
    from app.data_providers.geocoding_provider import forward_geocode_search

    clean_q = q.strip()
    if not clean_q:
        raise HTTPException(status_code=400, detail="Search query 'q' cannot be empty.")

    results = forward_geocode_search(clean_q, limit=5)
    return {
        "query": clean_q,
        "results": results,
        "count": len(results)
    }

@router.post("/location-assessment")
@router.post("/location-risk")
def get_public_location_assessment(payload: Dict[str, Any]):
    """
    Public Endpoint: Computes unified real-time location-specific risk, weather, hazard breakdown,
    and safe relocation recommendation for any coordinate in India.
    Accepts device GPS, searched locations, or map selection coordinates.
    """
    from fastapi import HTTPException
    from app.services.risk_service import calculate_location_risk_assessment

    raw_lat = payload.get("latitude")
    raw_lon = payload.get("longitude")
    if raw_lat is None or raw_lon is None:
        raise HTTPException(status_code=422, detail="latitude and longitude parameters are required.")

    try:
        lat = float(raw_lat)
        lon = float(raw_lon)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Invalid coordinates: latitude and longitude must be numbers.")

    if lat < -90.0 or lat > 90.0 or lon < -180.0 or lon > 180.0:
        raise HTTPException(status_code=422, detail=f"Invalid coordinate bounds: latitude ({lat}) must be in [-90, 90] and longitude ({lon}) in [-180, 180].")

    accuracy = float(payload.get("accuracy_meters") or payload.get("accuracy") or 15.0)
    source = str(payload.get("source", "GPS"))
    assessment_radius_m = float(payload.get("assessment_radius_m") or 1000.0)

    assessment = calculate_location_risk_assessment(
        latitude=lat,
        longitude=lon,
        accuracy=accuracy,
        source=source,
        assessment_radius_m=assessment_radius_m
    )
    return assessment

@router.post("/location-alerts/check")
def check_public_location_alerts(payload: Dict[str, Any]):
    """
    Public Endpoint: Checks if a given coordinate falls within an active verified hazard zone
    and evaluates whether a location-aware emergency alert should be issued.
    Distinguishes CURRENT/FORECAST risk from HISTORICAL risk.
    """
    from fastapi import HTTPException
    from app.services.emergency_alert_service import evaluate_location_emergency_risk

    raw_lat = payload.get("latitude")
    raw_lon = payload.get("longitude")
    if raw_lat is None or raw_lon is None:
        raise HTTPException(status_code=422, detail="latitude and longitude parameters are required.")

    try:
        lat = float(raw_lat)
        lon = float(raw_lon)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Invalid coordinates: latitude and longitude must be numbers.")

    accuracy = float(payload.get("accuracy_meters") or payload.get("accuracy") or 15.0)
    result = evaluate_location_emergency_risk(latitude=lat, longitude=lon, accuracy_m=accuracy)
    return result

