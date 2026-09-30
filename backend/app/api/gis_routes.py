"""
KSHEMA Disaster Risk & Safe Relocation GIS Intelligence API Routes
Authoritative administrative GIS endpoints for national, state, and location risk intelligence.
"""

from fastapi import APIRouter, HTTPException, Query, Path
from typing import Dict, Any, List, Optional

from app.services.national_gis_service import (
    get_national_gis_overview,
    get_state_gis_summary,
    filter_national_risk_locations,
    get_location_gis_detail,
    get_location_history
)
from app.data_providers.national_boundaries import (
    get_all_supported_states,
    get_state_boundaries_geojson
)

router = APIRouter()

@router.get("/overview")
@router.get("/national")
def api_get_national_overview():
    """Returns nationwide overview, coverage statistics, and severity distribution."""
    return get_national_gis_overview()

@router.get("/states")
def api_get_all_states():
    """Returns list of all Indian States and Union Territories with geographic metadata."""
    return get_all_supported_states()

@router.get("/state-boundaries")
def api_get_state_boundaries():
    """Returns official GeoJSON boundaries of Indian States for administrative GIS rendering."""
    return get_state_boundaries_geojson()

@router.get("/summary/{state}")
def api_get_state_summary(state: str = Path(..., description="Name of the Indian State/UT")):
    """Returns compact summary and district metrics for a selected state."""
    summary = get_state_gis_summary(state)
    if not summary:
        raise HTTPException(status_code=404, detail=f"State '{state}' not recognized in geographic registry.")
    return summary

@router.get("/locations")
def api_get_risk_locations(
    state: Optional[str] = Query(None, description="Filter by state (e.g. Telangana, Uttarakhand, All)"),
    district: Optional[str] = Query(None, description="Filter by district"),
    risk_level: Optional[str] = Query(None, description="Filter by risk severity: MODERATE, HIGH, EXTREMELY HIGH, CRITICAL, ALL"),
    hazard_type: Optional[str] = Query(None, description="Filter by primary or secondary hazard type"),
    priority_category: Optional[str] = Query(None, description="Filter by executive priority category: IMMEDIATE REVIEW, PRIORITY ASSESSMENT, MONITOR"),
    bbox: Optional[str] = Query(None, description="Bounding box query: min_lon,min_lat,max_lon,max_lat")
):
    """
    Returns filtered risk locations with spatial extent, risk score, executive priority ranking, and safe relocation candidates.
    Supports multi-filtering across State, District, Severity Level, Hazard Type, Priority Category, and Bounding Box.
    """
    locations = filter_national_risk_locations(
        state=state,
        district=district,
        risk_level=risk_level,
        hazard_type=hazard_type,
        priority_category=priority_category,
        bbox=bbox
    )

    # Convert to standard GeoJSON FeatureCollection for standard GIS consumption
    features = []
    for loc in locations:
        features.append({
            "type": "Feature",
            "properties": {
                "id": loc["id"],
                "name": loc["location_name"],
                "state": loc["state"],
                "district": loc["district"],
                "risk_score": loc["risk_score"],
                "risk_level": loc["risk_level"],
                "primary_hazard": loc["primary_hazard"],
                "secondary_hazards": loc.get("secondary_hazards", []),
                "population": loc["population"],
                "vulnerable_population": loc.get("vulnerable_population", 0),
                "risk_radius_km": loc.get("risk_radius_km", 1.0),
                "priority_score": loc.get("priority_score", 0.0),
                "priority_category": loc.get("priority_category", "MONITOR"),
                "priority_rank": loc.get("priority_rank", 1),
                "priority_reasons": loc.get("priority_reasons", []),
                "assessment_date": loc.get("assessment_date"),
                "verification_status": loc.get("verification_status", "VERIFIED_OFFICIAL"),
                "recommended_safe_site": loc.get("recommended_safe_site")
            },
            "geometry": {
                "type": "Point",
                "coordinates": [loc["longitude"], loc["latitude"]]
            }
        })

    return {
        "type": "FeatureCollection",
        "total_count": len(locations),
        "applied_filters": {
            "state": state or "ALL",
            "district": district or "ALL",
            "risk_level": risk_level or "ALL",
            "hazard_type": hazard_type or "ALL",
            "priority_category": priority_category or "ALL"
        },
        "features": features,
        "locations": locations
    }

@router.get("/location/{id}")
def api_get_location_detail(id: str = Path(..., description="Risk location identifier")):
    """Returns detailed assessment, risk factors, and recommended relocation candidate for location."""
    loc = get_location_gis_detail(id)
    if not loc:
        raise HTTPException(status_code=404, detail=f"Location '{id}' not found in national risk registry.")
    return loc

@router.get("/history/{id}")
def api_get_location_history(id: str = Path(..., description="Risk location identifier")):
    """Returns historical risk assessment records for location without fake data."""
    return get_location_history(id)
