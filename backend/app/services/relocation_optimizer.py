import math
import uuid
from typing import List, Dict, Any
from app.services.relocation_service import find_location_relocation_options

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def generate_relocation_plan(
    habitation: dict,
    candidate_sites: List[dict] = None,
    target_population_override: int = None
) -> dict:
    """
    Constrained Multi-Site Relocation Optimization Solver.
    Uses central find_location_relocation_options engine enforcing strict multi-hazard safety exclusions,
    carrying capacity limits, distance ordering, and standardized response schemas.
    """
    req_pop = target_population_override if target_population_override is not None else habitation.get("population", 1250)
    hab_lat = habitation["latitude"]
    hab_lng = habitation["longitude"]
    hab_id = habitation.get("id", "HAB-001")
    hab_name = habitation.get("name", "Target Habitation")
    hab_risk = habitation.get("risk_score", 85.0)
    hab_vuln = habitation.get("vulnerability_score", 70.0)
    hab_level = habitation.get("risk_level", "CRITICAL")

    reloc_res = find_location_relocation_options(
        latitude=hab_lat,
        longitude=hab_lng,
        population_to_relocate=req_pop,
        risk_level=hab_level,
        habitation_id=hab_id,
        habitation_name=hab_name,
        risk_score=hab_risk,
        vulnerability_score=hab_vuln,
        candidate_sites=candidate_sites
    )

    urgency_map = {
        "CRITICAL": "IMMEDIATE",
        "VERY HIGH": "IMMEDIATE",
        "HIGH": "SHORT-TERM",
        "MODERATE": "MEDIUM-TERM",
        "LOW": "MONITOR"
    }
    urgency = urgency_map.get(hab_level, "SHORT-TERM")

    return {
        **reloc_res,
        "plan_id": reloc_res.get("plan_id", f"PLAN-{uuid.uuid4().hex[:8].upper()}"),
        "habitation_id": hab_id,
        "habitation_name": hab_name,
        "required_population": req_pop,
        "allocated_population": reloc_res["allocated_population"],
        "unallocated_population": reloc_res["unallocated_population"],
        "status": reloc_res["overall_status"],
        "allocations": reloc_res["allocations"],
        "urgency": urgency,
        "recommendation_notes": reloc_res["recommendations"],
        "rejected_sites_audit": reloc_res["rejected_sites"],
        "created_at": reloc_res["calculated_at"]
    }

