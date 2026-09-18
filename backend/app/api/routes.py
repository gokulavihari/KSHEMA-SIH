from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Dict, Any, Optional
import uuid

from app.services.data_seed import (
    RAW_HABITATIONS, RAW_CANDIDATE_SITES, DATA_SOURCES, INITIAL_ALERTS,
    RIVERS_GEOJSON, ROADS_GEOJSON, INFRASTRUCTURE_FACILITIES
)
from app.services.hazard_engine import calculate_hazard_scores, generate_red_zones
from app.services.risk_engine import calculate_habitation_risk
from app.services.vulnerability_engine import calculate_vulnerability_and_priority
from app.services.capacity_engine import calculate_site_capacity
from app.services.relocation_optimizer import generate_relocation_plan
from app.services.simulation_engine import run_extreme_rainfall_simulation
from app.services.risk_service import calculate_location_risk_assessment
from app.services.relocation_service import find_location_relocation_options
from app.data_providers.geocoding_provider import reverse_geocode, forward_geocode
from app.data_providers.provider_registry import get_data_providers_status
from app.models.schemas import (
    HabitationSchema, CandidateSiteSchema, RelocationPlanSchema,
    SimulationRequestSchema, SimulationResponseSchema, DataSourceSchema,
    AlertSchema, FieldReportSchema
)

router = APIRouter()


# In-memory storage for field reports and active state
FIELD_REPORTS_STORE = [
    {
        "id": "RPT-101",
        "location": "Raini Village Slope",
        "latitude": 30.4852,
        "longitude": 79.6914,
        "severity": "HIGH",
        "issue_type": "Slope Cracks Detected",
        "description": "Active tension cracks observed 40m above upper residential cluster. Water seepage visible.",
        "timestamp": "2026-09-09 21:15",
        "officer_id": "NDRF-OFFICER-44"
    }
]

CURRENT_SIMULATION_STATE = {
    "rainfall_multiplier": 1.0,
    "label": "1.0x Baseline Monsoon"
}

@router.get("/health")
def get_health():
    return {
        "status": "HEALTHY",
        "system": "AASHRAY Decision-Support Platform",
        "version": "1.0.0",
        "pilot_region": "Chamoli District, Uttarakhand",
        "database": "SQLite + GeoPandas Spatial Engine Mode",
        "timestamp": "2026-09-09T22:50:00Z"
    }

@router.get("/dashboard")
def get_dashboard():
    mult = CURRENT_SIMULATION_STATE["rainfall_multiplier"]
    hab_list = []
    
    for h in RAW_HABITATIONS:
        v = calculate_vulnerability_and_priority(h, rainfall_multiplier=mult)
        hab_list.append({
            **h,
            "risk_score": v["risk_score"],
            "risk_level": v["risk_level"],
            "relocation_priority": v["relocation_priority"]
        })
        
    total_pop = sum(h["population"] for h in hab_list)
    pop_at_risk = sum(h["population"] for h in hab_list if h["risk_score"] >= 61.0)
    critical_habs = [h for h in hab_list if h["risk_score"] >= 81.0]
    
    immediate_count = sum(h["population"] for h in hab_list if h["relocation_priority"] == "IMMEDIATE")
    short_term_count = sum(h["population"] for h in hab_list if h["relocation_priority"] == "SHORT-TERM")
    medium_term_count = sum(h["population"] for h in hab_list if h["relocation_priority"] == "MEDIUM-TERM")
    
    # Capacity summary across safe candidate sites
    safe_sites = [s for s in RAW_CANDIDATE_SITES if s.get("is_safe", True)]
    total_safe_cap = 0
    total_used_cap = 0
    
    for s in safe_sites:
        cap_info = calculate_site_capacity(s, s.get("used_capacity", 0))
        total_safe_cap += cap_info["effective_capacity"]
        total_used_cap += cap_info["used_capacity"]
        
    capacity_utilization_pct = round((total_used_cap / total_safe_cap * 100.0), 1) if total_safe_cap > 0 else 0.0
    
    return {
        "simulation_state": CURRENT_SIMULATION_STATE,
        "kpis": {
            "total_population": total_pop,
            "population_at_risk": pop_at_risk,
            "critical_habitations_count": len(critical_habs),
            "red_zone_area_sqkm": round(18.5 * mult, 1),
            "immediate_relocation_pop": immediate_count,
            "short_term_relocation_pop": short_term_count,
            "medium_term_relocation_pop": medium_term_count,
            "available_safe_capacity": total_safe_cap,
            "capacity_utilization_pct": capacity_utilization_pct
        },
        "critical_habitations": [
            {
                "id": h["id"],
                "name": h["name"],
                "population": h["population"],
                "risk_score": h["risk_score"],
                "priority": h["relocation_priority"],
                "dominant_hazard": h["dominant_hazard"]
            } for h in hab_list if h["risk_score"] >= 61.0
        ]
    }

@router.get("/habitations")
def get_habitations(
    priority: Optional[str] = None,
    risk_level: Optional[str] = None
):
    mult = CURRENT_SIMULATION_STATE["rainfall_multiplier"]
    results = []
    
    for hab in RAW_HABITATIONS:
        v = calculate_vulnerability_and_priority(hab, rainfall_multiplier=mult)
        item = {
            **hab,
            "risk_score": v["risk_score"],
            "risk_level": v["risk_level"],
            "vulnerability_score": v["vulnerability_score"],
            "exposure_score": v["exposure_score"],
            "relocation_priority": v["relocation_priority"],
            "relocation_urgency_score": v["relocation_urgency_score"],
            "evidence_level": v["evidence_level"],
            "factors": v["factors"]
        }
        
        if priority and item["relocation_priority"].upper() != priority.upper():
            continue
        if risk_level and item["risk_level"].upper() != risk_level.upper():
            continue
            
        results.append(item)
        
    return results

@router.get("/habitations/{id}")
def get_habitation_detail(id: str):
    mult = CURRENT_SIMULATION_STATE["rainfall_multiplier"]
    hab = next((h for h in RAW_HABITATIONS if h["id"] == id), None)
    if not hab:
        raise HTTPException(status_code=404, detail="Habitation not found")
        
    v = calculate_vulnerability_and_priority(hab, rainfall_multiplier=mult)
    
    # Recommended relocation plan
    rec_plan = generate_relocation_plan(hab, RAW_CANDIDATE_SITES)
    
    return {
        **hab,
        "risk_score": v["risk_score"],
        "risk_level": v["risk_level"],
        "vulnerability_score": v["vulnerability_score"],
        "exposure_score": v["exposure_score"],
        "relocation_priority": v["relocation_priority"],
        "relocation_urgency_score": v["relocation_urgency_score"],
        "evidence_level": v["evidence_level"],
        "factors": v["factors"],
        "recommended_plan": rec_plan
    }

@router.get("/risk-map")
def get_risk_map():
    mult = CURRENT_SIMULATION_STATE["rainfall_multiplier"]
    
    # Habitations GeoJSON
    hab_features = []
    processed_habs = []
    
    for h in RAW_HABITATIONS:
        v = calculate_vulnerability_and_priority(h, rainfall_multiplier=mult)
        full_h = {
            **h,
            "risk_score": v["risk_score"],
            "risk_level": v["risk_level"],
            "evidence_level": v["evidence_level"]
        }
        processed_habs.append(full_h)
        
        hab_features.append({
            "type": "Feature",
            "properties": {
                "id": h["id"],
                "name": h["name"],
                "population": h["population"],
                "risk_score": v["risk_score"],
                "risk_level": v["risk_level"],
                "priority": v["relocation_priority"],
                "dominant_hazard": h["dominant_hazard"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [h["longitude"], h["latitude"]]
            }
        })
        
    # Candidate sites GeoJSON
    site_features = []
    for s in RAW_CANDIDATE_SITES:
        cap_info = calculate_site_capacity(s, s.get("used_capacity", 0))
        site_features.append({
            "type": "Feature",
            "properties": {
                "id": s["id"],
                "name": s["name"],
                "site_type": s["site_type"],
                "is_safe": s.get("is_safe", True),
                "safety_score": s.get("safety_score", 100.0),
                "effective_capacity": cap_info["effective_capacity"],
                "bottleneck": cap_info["bottleneck"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [s["longitude"], s["latitude"]]
            }
        })
        
    red_zones_geojson = generate_red_zones(processed_habs)
    
    return {
        "habitations": {
            "type": "FeatureCollection",
            "features": hab_features
        },
        "candidate_sites": {
            "type": "FeatureCollection",
            "features": site_features
        },
        "red_zones": red_zones_geojson,
        "rivers": RIVERS_GEOJSON,
        "roads": ROADS_GEOJSON,
        "infrastructure": INFRASTRUCTURE_FACILITIES
    }

@router.get("/hazards")
def get_hazards_summary():
    mult = CURRENT_SIMULATION_STATE["rainfall_multiplier"]
    hazard_list = []
    for h in RAW_HABITATIONS:
        h_scores = calculate_hazard_scores(h, rainfall_multiplier=mult)
        hazard_list.append({
            "habitation_id": h["id"],
            "habitation_name": h["name"],
            "dominant_hazard": h["dominant_hazard"],
            "flood_hazard": h_scores["flood_hazard"],
            "landslide_susceptibility": h_scores["landslide_susceptibility"],
            "extreme_rainfall": h_scores["extreme_rainfall"],
            "slope_severity": h_scores["slope_severity"],
            "river_proximity": h_scores["river_proximity"]
        })
    return {
        "rainfall_multiplier": mult,
        "hazards": hazard_list
    }

@router.get("/relocation-sites")
def get_relocation_sites():
    results = []
    for s in RAW_CANDIDATE_SITES:
        cap_info = calculate_site_capacity(s, s.get("used_capacity", 0))
        remaining = cap_info["remaining_capacity"]
        eff = cap_info["effective_capacity"]
        util = round((s.get("used_capacity", 0) / eff * 100.0), 1) if eff > 0 else 100.0
        
        results.append({
            "site_id": s.get("site_id", s["id"]),
            "id": s["id"],
            "name": s["name"],
            "address": s.get("address", "Chamoli District, Uttarakhand"),
            "district": s["district"],
            "subdistrict": s["subdistrict"],
            "state": s.get("state", "Uttarakhand"),
            "latitude": s["latitude"],
            "longitude": s["longitude"],
            "site_type": s["site_type"],
            "source_type": s.get("source_type", "DEMONSTRATION_DATA"),
            "source_url": s.get("source_url"),
            "source_reference": s.get("source_reference"),
            "verification_status": s.get("verification_status", "DEMONSTRATION_ONLY"),
            "last_updated": s.get("last_updated", "2026-09-17"),
            "data_freshness": s.get("data_freshness", "CURRENT"),
            "is_safe": s.get("is_safe", True),
            "safety_status": s.get("safety_status", "SAFE_CANDIDATE" if s.get("is_safe", True) else "REJECTED"),
            "rejection_reason": s.get("rejection_reason"),
            "hazard_status": s.get("hazard_status", "SAFE" if s.get("is_safe", True) else "UNSAFE"),
            "hazard_reasons": s.get("hazard_reasons", []),
            "land_area_sqm": s["land_area_sqm"],
            "safety_score": s["safety_score"],
            "suitability_score": s["suitability_score"],
            "capacity": cap_info,
            "used_capacity": s.get("used_capacity", 0),
            "remaining_capacity": remaining,
            "utilization_percentage": util,
            "distance_km": 0.0,
            "distance_type": "straight_line",
            "water_availability_lpd": s["water_lpd"],
            "nearest_hospital_km": s["nearest_hospital_km"],
            "nearest_school_km": s["nearest_school_km"],
            "road_accessibility": s["road_accessibility"],
            "is_demonstration": s.get("is_demonstration", True),
            "model_version": s.get("model_version", "AASHRAY-RELOC-v2.0")
        })
    return results

@router.get("/relocation-sites/{id}")
def get_relocation_site_detail(id: str):
    s = next((site for site in RAW_CANDIDATE_SITES if site.get("id") == id or site.get("site_id") == id), None)
    if not s:
        raise HTTPException(status_code=404, detail=f"Relocation site {id} not found")
        
    cap_info = calculate_site_capacity(s, s.get("used_capacity", 0))
    eff = cap_info["effective_capacity"]
    util = round((s.get("used_capacity", 0) / eff * 100.0), 1) if eff > 0 else 100.0
    
    return {
        "site_id": s.get("site_id", s["id"]),
        "id": s["id"],
        "name": s["name"],
        "address": s.get("address", "Chamoli District, Uttarakhand"),
        "district": s["district"],
        "subdistrict": s["subdistrict"],
        "state": s.get("state", "Uttarakhand"),
        "latitude": s["latitude"],
        "longitude": s["longitude"],
        "site_type": s["site_type"],
        "source_type": s.get("source_type", "DEMONSTRATION_DATA"),
        "source_url": s.get("source_url"),
        "source_reference": s.get("source_reference"),
        "verification_status": s.get("verification_status", "DEMONSTRATION_ONLY"),
        "last_updated": s.get("last_updated", "2026-09-17"),
        "data_freshness": s.get("data_freshness", "CURRENT"),
        "is_safe": s.get("is_safe", True),
        "safety_status": s.get("safety_status", "SAFE_CANDIDATE" if s.get("is_safe", True) else "REJECTED"),
        "rejection_reason": s.get("rejection_reason"),
        "hazard_status": s.get("hazard_status", "SAFE" if s.get("is_safe", True) else "UNSAFE"),
        "hazard_reasons": s.get("hazard_reasons", []),
        "land_area_sqm": s["land_area_sqm"],
        "safety_score": s["safety_score"],
        "suitability_score": s["suitability_score"],
        "capacity": cap_info,
        "used_capacity": s.get("used_capacity", 0),
        "remaining_capacity": cap_info["remaining_capacity"],
        "utilization_percentage": util,
        "water_availability_lpd": s["water_lpd"],
        "nearest_hospital_km": s["nearest_hospital_km"],
        "nearest_school_km": s["nearest_school_km"],
        "road_accessibility": s["road_accessibility"],
        "is_demonstration": s.get("is_demonstration", True),
        "model_version": s.get("model_version", "AASHRAY-RELOC-v2.0")
    }

@router.post("/calculate-risk")
def calculate_custom_risk(payload: Dict[str, Any] = Body(...)):
    mult = payload.get("rainfall_multiplier", CURRENT_SIMULATION_STATE["rainfall_multiplier"])
    custom_weights = payload.get("custom_weights")
    
    # If a specific habitation payload is provided, calculate for it; else use baseline Raini Village
    hab_data = payload.get("habitation")
    if not hab_data:
        hab_id = payload.get("habitation_id", "HAB-001")
        hab_data = next((h for h in RAW_HABITATIONS if h["id"] == hab_id), RAW_HABITATIONS[0])
        
    risk_info = calculate_habitation_risk(hab_data, rainfall_multiplier=mult, custom_weights=custom_weights)
    vuln_info = calculate_vulnerability_and_priority(hab_data, rainfall_multiplier=mult)
    
    return {
        "habitation_id": hab_data.get("id", "CUSTOM-HAB"),
        "habitation_name": hab_data.get("name", "Custom Habitation"),
        "rainfall_multiplier": mult,
        "risk_score": risk_info["risk_score"],
        "risk_level": risk_info["risk_level"],
        "vulnerability_score": vuln_info["vulnerability_score"],
        "exposure_score": risk_info["exposure_score"],
        "relocation_priority": vuln_info["relocation_priority"],
        "evidence_level": risk_info["evidence_level"],
        "factors": risk_info["factors"]
    }

@router.post("/relocation-plan")
def create_relocation_plan(payload: Dict[str, Any] = Body(...)):
    hab_id = payload.get("habitation_id", "HAB-001")
    pop_override = payload.get("population_override")
    
    hab = next((h for h in RAW_HABITATIONS if h["id"] == hab_id), RAW_HABITATIONS[0])
    plan = generate_relocation_plan(hab, RAW_CANDIDATE_SITES, target_population_override=pop_override)
    return plan

@router.get("/capacity")
def get_capacity_matrix():
    matrix = []
    for s in RAW_CANDIDATE_SITES:
        cap_info = calculate_site_capacity(s, s.get("used_capacity", 0))
        matrix.append({
            "site_id": s["id"],
            "site_name": s["name"],
            "is_safe": s.get("is_safe", True),
            "breakdown": cap_info
        })
    return matrix

@router.get("/alerts")
def get_alerts():
    return INITIAL_ALERTS

@router.post("/simulate/extreme-rainfall")
def trigger_rainfall_simulation(payload: SimulationRequestSchema):
    mult = payload.rainfall_multiplier
    CURRENT_SIMULATION_STATE["rainfall_multiplier"] = mult
    CURRENT_SIMULATION_STATE["label"] = f"{mult}x Extreme Rainfall Scenario"
    
    sim_res = run_extreme_rainfall_simulation(mult)
    return sim_res

@router.post("/simulate/reset")
def reset_simulation():
    CURRENT_SIMULATION_STATE["rainfall_multiplier"] = 1.0
    CURRENT_SIMULATION_STATE["label"] = "1.0x Baseline Monsoon"
    return {
        "message": "Simulation reset to baseline state",
        "simulation_state": CURRENT_SIMULATION_STATE
    }

@router.get("/data-sources")
def get_data_sources():
    return get_data_providers_status()

@router.get("/data-sources/status")
def get_data_sources_status():
    return get_data_providers_status()

@router.post("/location/assess")
def assess_location(
    payload: Dict[str, Any] = Body(...),
    debug: bool = Query(False, description="Enable developer debug mode output")
):
    req_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
    raw_lat = payload.get("latitude")
    raw_lon = payload.get("longitude")
    if raw_lat is None or raw_lon is None:
        raise HTTPException(status_code=422, detail="Must provide latitude and longitude parameters.")

    try:
        lat = float(raw_lat)
        lon = float(raw_lon)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Invalid coordinates: latitude and longitude must be valid numbers.")

    if lat < -90.0 or lat > 90.0:
        raise HTTPException(status_code=422, detail="Latitude must be between -90 and 90 degrees.")
    if lon < -180.0 or lon > 180.0:
        raise HTTPException(status_code=422, detail="Longitude must be between -180 and 180 degrees.")

    accuracy = float(payload.get("accuracy", 15.0))
    source = str(payload.get("source", "GPS"))
    mult = CURRENT_SIMULATION_STATE["rainfall_multiplier"]
    radius_m = float(payload.get("assessment_radius_m", 1000.0))
    include_debug = debug or bool(payload.get("debug", False))

    import logging
    logger = logging.getLogger("aashray.api")
    logger.info(f"[{req_id}] LOCATION_ASSESSMENT_REQUEST lat={lat} lon={lon} source={source} debug={include_debug}")

    try:
        assessment = calculate_location_risk_assessment(
            latitude=lat,
            longitude=lon,
            accuracy=accuracy,
            source=source,
            rainfall_multiplier=mult,
            assessment_radius_m=radius_m
        )
        assessment["request_id"] = req_id
        
        logger.info(
            f"[{req_id}] LOCATION_ASSESSMENT_SUCCESS lat={lat} lon={lon} "
            f"risk_score={assessment.get('risk_score')} risk_level={assessment.get('risk_level')} "
            f"coverage_pct={assessment.get('coverage_percentage')}%"
        )
        
        if not include_debug and "debug_info" in assessment:
            # Keep debug_info for developer inspection or omit if minimal payload requested
            pass

        return assessment
    except HTTPException:
        raise
    except Exception as err:
        import traceback
        logger.error(f"[{req_id}] Error computing location assessment: {str(err)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": "LOCATION_ASSESSMENT_PIPELINE_ERROR",
                "message": f"Failed to compute spatial assessment for coordinate ({lat}, {lon})",
                "details": str(err),
                "request_id": req_id
            }
        )


@router.post("/location/resolve")
def resolve_location(payload: Dict[str, Any] = Body(...)):
    address = payload.get("address")
    lat = payload.get("latitude")
    lon = payload.get("longitude")

    if address is not None and str(address).strip():
        res = forward_geocode(str(address))
        if res:
            return res

    if lat is not None and lon is not None:
        try:
            return reverse_geocode(float(lat), float(lon))
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="Latitude and Longitude must be valid numbers")

    raise HTTPException(status_code=400, detail="Must provide either address string or latitude/longitude coordinates")


@router.get("/debug/relocation-sites-summary")
def get_relocation_sites_summary():
    total_sites = len(RAW_CANDIDATE_SITES)
    active_sites = [s for s in RAW_CANDIDATE_SITES if s.get("status", "ACTIVE") != "INACTIVE"]
    valid_coords = [s for s in RAW_CANDIDATE_SITES if s.get("latitude") is not None and s.get("longitude") is not None and -90 <= s["latitude"] <= 90 and -180 <= s["longitude"] <= 180]
    invalid_coords = [s for s in RAW_CANDIDATE_SITES if s not in valid_coords]
    safe_sites = [s for s in RAW_CANDIDATE_SITES if s.get("is_safe", True) and not s.get("rejection_reason")]
    unsafe_sites = [s for s in RAW_CANDIDATE_SITES if not s.get("is_safe", True) or s.get("rejection_reason")]
    
    pos_cap = []
    zero_cap = []
    for s in RAW_CANDIDATE_SITES:
        cap = calculate_site_capacity(s, s.get("used_capacity", 0))
        if cap["effective_capacity"] > 0:
            pos_cap.append(s)
        else:
            zero_cap.append(s)
            
    demo_sites = [s for s in RAW_CANDIDATE_SITES if s.get("is_demonstration", False) or s.get("source_type") == "DEMONSTRATION_DATA"]
    verified_sites = [s for s in RAW_CANDIDATE_SITES if s.get("verification_status") in ["VERIFIED_OFFICIAL", "VERIFIED_FIELD"]]
    
    rejected_breakdown = [
        {
            "site_id": s.get("site_id", s.get("id")),
            "site_name": s["name"],
            "district": s.get("district"),
            "subdistrict": s.get("subdistrict"),
            "rejection_reason": s.get("rejection_reason") or ("Zero Capacity" if s in zero_cap else "Unverified"),
            "verification_status": s.get("verification_status"),
            "is_safe": s.get("is_safe", True)
        }
        for s in RAW_CANDIDATE_SITES if (not s.get("is_safe", True) or s.get("rejection_reason") or s in zero_cap)
    ]

    from datetime import datetime, timezone
    return {
        "summary": {
            "total_site_count": total_sites,
            "active_site_count": len(active_sites),
            "valid_coordinates_count": len(valid_coords),
            "invalid_coordinates_count": len(invalid_coords),
            "safe_sites_count": len(safe_sites),
            "unsafe_sites_count": len(unsafe_sites),
            "positive_capacity_count": len(pos_cap),
            "zero_capacity_count": len(zero_cap),
            "demonstration_sites_count": len(demo_sites),
            "verified_sites_count": len(verified_sites),
            "rejected_sites_count": len(rejected_breakdown)
        },
        "all_sites_inventory": [
            {
                "site_id": s.get("site_id", s["id"]),
                "name": s["name"],
                "latitude": s.get("latitude"),
                "longitude": s.get("longitude"),
                "district": s.get("district"),
                "subdistrict": s.get("subdistrict"),
                "state": s.get("state", "Uttarakhand"),
                "site_type": s.get("site_type"),
                "effective_capacity": calculate_site_capacity(s, s.get("used_capacity", 0))["effective_capacity"],
                "remaining_capacity": calculate_site_capacity(s, s.get("used_capacity", 0))["remaining_capacity"],
                "bottleneck": calculate_site_capacity(s, s.get("used_capacity", 0))["bottleneck"],
                "is_safe": s.get("is_safe", True),
                "safety_status": s.get("safety_status"),
                "hazard_status": s.get("hazard_status"),
                "river_distance_m": s.get("river_distance_m"),
                "source_name": s.get("source_reference", s.get("source_type")),
                "source_url": s.get("source_url"),
                "source_date": s.get("last_updated"),
                "source_type": s.get("source_type"),
                "verification_status": s.get("verification_status"),
                "is_demonstration": s.get("is_demonstration", False),
                "rejection_reason": s.get("rejection_reason")
            }
            for s in RAW_CANDIDATE_SITES
        ],
        "rejected_sites_audit": rejected_breakdown,
        "environment": "DEVELOPMENT_ONLY",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    }

@router.get("/debug/database-readiness")
def get_database_readiness():
    total_habs = len(RAW_HABITATIONS)
    total_sites = len(RAW_CANDIDATE_SITES)
    active_sites = [s for s in RAW_CANDIDATE_SITES if s.get("status", "ACTIVE") != "INACTIVE"]
    
    valid_coords = [s for s in RAW_CANDIDATE_SITES if s.get("latitude") is not None and s.get("longitude") is not None and -90 <= s["latitude"] <= 90 and -180 <= s["longitude"] <= 180]
    missing_coords = [s for s in RAW_CANDIDATE_SITES if s not in valid_coords]
    
    safe_sites = [s for s in RAW_CANDIDATE_SITES if s.get("is_safe", True) and not s.get("rejection_reason")]
    unsafe_sites = [s for s in RAW_CANDIDATE_SITES if not s.get("is_safe", True) or s.get("rejection_reason")]
    
    verified_sites = [s for s in RAW_CANDIDATE_SITES if s.get("verification_status") in ["VERIFIED_OFFICIAL", "VERIFIED_FIELD"]]
    demo_sites = [s for s in RAW_CANDIDATE_SITES if s.get("is_demonstration", False) or s.get("source_type") == "DEMONSTRATION_DATA"]
    
    pos_cap = []
    unknown_cap = []
    for s in RAW_CANDIDATE_SITES:
        cap = calculate_site_capacity(s, s.get("used_capacity", 0))
        if cap["effective_capacity"] > 0:
            pos_cap.append(s)
        else:
            unknown_cap.append(s)
            
    with_source_meta = [s for s in RAW_CANDIDATE_SITES if s.get("source_type") or s.get("source_reference")]
    without_source_meta = [s for s in RAW_CANDIDATE_SITES if s not in with_source_meta]

    district_sites: Dict[str, int] = {}
    for s in RAW_CANDIDATE_SITES:
        d = s.get("district", "Chamoli")
        district_sites[d] = district_sites.get(d, 0) + 1

    district_habs: Dict[str, int] = {}
    for h in RAW_HABITATIONS:
        sub = h.get("subdistrict", "Joshimath")
        district_habs[sub] = district_habs.get(sub, 0) + 1

    from datetime import datetime, timezone
    return {
        "status": "READY_FOR_SIH_JURY_DEMO",
        "environment": "DEVELOPMENT_ONLY",
        "metrics": {
            "total_habitations": total_habs,
            "total_relocation_sites": total_sites,
            "total_active_relocation_sites": len(active_sites),
            "sites_with_valid_coordinates": len(valid_coords),
            "sites_with_missing_coordinates": len(missing_coords),
            "sites_marked_safe": len(safe_sites),
            "sites_marked_unsafe": len(unsafe_sites),
            "verified_sites": len(verified_sites),
            "demonstration_sites": len(demo_sites),
            "sites_with_real_capacity": len(pos_cap),
            "sites_with_unknown_capacity": len(unknown_cap),
            "sites_with_source_metadata": len(with_source_meta),
            "sites_without_source_metadata": len(without_source_meta),
            "district_wise_site_count": district_sites,
            "subdistrict_wise_habitation_count": district_habs
        },
        "geographic_coverage_disclaimer": "The current database indexes high-resolution habitations and relief shelters across the Chamoli Pilot Region and Uttarakhand Himalayan Belt. For locations outside this indexed region (e.g. Medchal, Hyderabad), the engine honestly returns NO_VERIFIED_SITE_FOUND with spatial out-of-coverage notices.",
        "calculated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    }

@router.post("/location/relocation-options")
def get_location_relocation_options(payload: Dict[str, Any] = Body(...)):
    lat = float(payload.get("latitude", 30.4852))
    lon = float(payload.get("longitude", 79.6914))
    pop = int(payload.get("population_to_relocate", 1250))
    risk_level = str(payload.get("risk_level", "CRITICAL"))
    hab_id = payload.get("habitation_id")
    hab_name = payload.get("habitation_name")
    risk_score = payload.get("risk_score")
    vuln_score = payload.get("vulnerability_score")

    options = find_location_relocation_options(
        latitude=lat,
        longitude=lon,
        population_to_relocate=pop,
        risk_level=risk_level,
        habitation_id=hab_id,
        habitation_name=hab_name,
        risk_score=risk_score,
        vulnerability_score=vuln_score
    )
    return options


@router.get("/field-reports")
def get_field_reports():
    return FIELD_REPORTS_STORE

@router.post("/field-reports")
def create_field_report(report: FieldReportSchema):
    new_rpt = report.dict()
    FIELD_REPORTS_STORE.append(new_rpt)
    return {"message": "Field report logged successfully", "report": new_rpt}

@router.get("/audit-logs")
def get_audit_logs():
    return [
        {
            "audit_id": "AUD-9901",
            "timestamp": "2026-09-11 00:15:00",
            "event": "LOCATION_RISK_ASSESSMENT",
            "habitation": "Raini Village (GPS Selected)",
            "model_version": "AASHRAY-RISK-v1.1.0",
            "weights_version": "DEFAULT_SIH_WEIGHTS",
            "status": "CRITICAL",
            "authority_review_status": "PENDING_AUTHORITY_SIGN_OFF"
        },
        {
            "audit_id": "AUD-9902",
            "timestamp": "2026-09-11 00:10:00",
            "event": "ADVERSARIAL_SITE_REJECTION",
            "site": "Tapovan Riverbank Lowland Park",
            "reason": "REJECTED: High Flash Flood Inundation & Landslide Runout Zone (River Distance < 100m)",
            "allocated_population": 0
        }
    ]

