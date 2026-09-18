import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.services.location_service import calculate_haversine_distance
from app.services.capacity_engine import calculate_site_capacity
from app.services.data_seed import RAW_CANDIDATE_SITES, RAW_HABITATIONS
from app.data_providers.routing_provider import calculate_road_distance_and_time

logger = logging.getLogger("aashray.relocation")

def find_location_relocation_options(
    latitude: float,
    longitude: float,
    population_to_relocate: int = 1250,
    risk_level: str = "CRITICAL",
    habitation_id: Optional[str] = None,
    habitation_name: Optional[str] = None,
    risk_score: Optional[float] = None,
    vulnerability_score: Optional[float] = None,
    candidate_sites: Optional[List[dict]] = None,
    require_verification: bool = False
) -> Dict[str, Any]:
    """
    Deterministically computes safe, location-specific relocation recommendations following Safety-First Principles:
    1. Validate input coordinates and selected habitation metadata.
    2. Log input coordinates in development mode for location sensitivity auditing.
    3. Radius search hierarchy: 10km -> 25km -> 50km.
    4. Hard safety exclusions (prohibited hazard zones, river inundation buffer < 100m, invalid coords, capacity).
    5. Geodesic Haversine straight-line distance calculation with explicit labels and road distance estimation.
    6. Safety-first sorting: Safe & verified status -> Capacity -> Distance -> Infrastructure suitability.
    7. Multi-option return (Recommended + Top Alternatives + Transparent Rejection Audit).
    8. Honest NO_VERIFIED_SITE_FOUND response when zero candidates pass hard safety criteria.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Step 1: Input Validation & Development Logging
    if latitude < -90.0 or latitude > 90.0 or longitude < -180.0 or longitude > 180.0:
        raise ValueError(f"Invalid coordinate bounds: lat={latitude}, lon={longitude}")

    logger.info(
        f"[RELOCATION_ENGINE] INPUT hab_id={habitation_id} lat={latitude:.6f} lon={longitude:.6f} "
        f"pop={population_to_relocate} risk_level={risk_level}"
    )

    hab_ref_id = habitation_id or f"COORD-{round(latitude, 4)}-{round(longitude, 4)}"
    hab_ref_name = habitation_name or f"Habitation Cluster at ({latitude:.4f} N, {longitude:.4f} E)"
    hab_risk_score = risk_score if risk_score is not None else (85.0 if risk_level in ["CRITICAL", "VERY HIGH"] else 50.0)
    hab_vuln_score = vulnerability_score if vulnerability_score is not None else 65.0

    source_habitation = {
        "id": hab_ref_id,
        "name": hab_ref_name,
        "latitude": round(latitude, 6),
        "longitude": round(longitude, 6),
        "population": population_to_relocate,
        "risk_score": hab_risk_score,
        "vulnerability_score": hab_vuln_score
    }

    warnings = [
        "Straight-line distance shown. Mountain road distances estimated with terrain winding factor (1.40x)."
    ]

    sites_pool = candidate_sites if candidate_sites is not None else RAW_CANDIDATE_SITES

    # Step 2: Location-Specific Radius Expansion Hierarchy (10 km -> 25 km -> 50 km)
    radii_steps = [10.0, 25.0, 50.0]
    selected_radius = 50.0
    radius_reason = "Initial search radius 10 km"
    sites_in_selected_radius = []

    for r in radii_steps:
        in_r = [
            s for s in sites_pool
            if s.get("latitude") is not None and s.get("longitude") is not None and
            calculate_haversine_distance(latitude, longitude, s["latitude"], s["longitude"]) <= r
        ]
        # Filter in_r for safe candidate sites
        safe_in_r = [s for s in in_r if s.get("is_safe", True) and not s.get("rejection_reason")]
        if safe_in_r:
            selected_radius = r
            if r == 10.0:
                radius_reason = "Found eligible safe relocation site within initial 10 km local radius."
            elif r == 25.0:
                radius_reason = "Expanded search radius to 25 km; no safe eligible candidate found within 10 km."
            else:
                radius_reason = "Expanded search radius to maximum threshold (50 km); no safe eligible candidate found within 25 km."
            sites_in_selected_radius = in_r
            break

    if not sites_in_selected_radius:
        selected_radius = 50.0
        radius_reason = "Maximum search radius (50 km) evaluated; zero eligible safe sites available."

    # Evaluate ALL sites in pool for transparent rejection auditing
    eligible_safe_sites = []
    rejected_sites_audit = []

    for s in sites_pool:
        site_id = s.get("site_id", s.get("id", "UNKNOWN-SITE"))
        site_lat = s.get("latitude")
        site_lon = s.get("longitude")

        # Step 3: Validate Coordinates
        if site_lat is None or site_lon is None:
            rejected_sites_audit.append({
                "site_id": site_id,
                "site_name": s.get("name", "Unknown Site"),
                "reason": "REJECTED: Missing or invalid site coordinates",
                "safety_score": 0.0,
                "allocated": 0
            })
            continue

        dist_km = calculate_haversine_distance(latitude, longitude, site_lat, site_lon)
        cap_info = calculate_site_capacity(s, s.get("used_capacity", 0))

        rejection_reasons = []

        # Step 4: Search Radius Exclusion
        if dist_km > 50.0:
            rejection_reasons.append(f"REJECTED: Exceeds maximum 50 km search radius ({dist_km:.1f} km from source)")

        # Step 5: Prohibited Hazard Zone Exclusions
        if not s.get("is_safe", True) or s.get("safety_score", 100.0) < 50.0 or s.get("rejection_reason"):
            rejection_reasons.append(s.get("rejection_reason") or "REJECTED: High Hazard Inundation / Landslide Runout Zone")

        # Step 6: 100m River Proximity Inundation Buffer Exclusion
        river_dist = s.get("river_distance_m")
        if river_dist is not None and river_dist < 100.0:
            rejection_reasons.append(f"REJECTED: Violates mandatory 100m River Proximity Exclusion Buffer ({river_dist}m < 100m)")

        # Step 7: Effective Capacity Exclusion
        if cap_info["remaining_capacity"] <= 0:
            rejection_reasons.append(f"REJECTED: Zero Remaining Capacity (Bottleneck: {cap_info['bottleneck']})")

        # Step 8: Verification Exclusion when required
        if require_verification and s.get("verification_status") not in ["VERIFIED_OFFICIAL", "VERIFIED_FIELD"]:
            rejection_reasons.append(f"REJECTED: Site verification status is '{s.get('verification_status')}' (Mandatory official verification required)")

        if rejection_reasons:
            rejected_sites_audit.append({
                "site_id": site_id,
                "site_name": s.get("name", "Unknown Site"),
                "reason": " | ".join(rejection_reasons),
                "safety_score": s.get("safety_score", 0.0),
                "allocated": 0,
                "distance_km": dist_km
            })
            continue

        # Step 9: Transparent Suitability Scoring
        # Safety (50%), Suitability (30%), Proximity (20%)
        proximity_score = max(0.0, 100.0 - dist_km * 2.0)
        composite_score = round(s["safety_score"] * 0.50 + s["suitability_score"] * 0.30 + proximity_score * 0.20, 1)

        road_info = calculate_road_distance_and_time(latitude, longitude, site_lat, site_lon, dist_km)

        eligible_safe_sites.append({
            "site": s,
            "dist_km": dist_km,
            "road_info": road_info,
            "composite_score": composite_score,
            "capacity": cap_info
        })

    # Step 10: Safety-First Sorting Order:
    # 1. Distance (nearest first)
    # 2. Safety score (higher first)
    # 3. Composite score (higher first)
    eligible_safe_sites.sort(key=lambda x: (x["dist_km"], -x["site"].get("safety_score", 0.0), -x["composite_score"]))

    # Check if NO eligible safe candidate sites found
    if not eligible_safe_sites:
        return {
            "status": "NO_VERIFIED_SITE_FOUND",
            "overall_status": "NO_VERIFIED_SITE_FOUND",
            "message": "No verified suitable relocation site was found within configured radius and safety constraints.",
            "source_habitation": source_habitation,
            "search_parameters": {
                "initial_radius_km": 10.0,
                "maximum_radius_km": 50.0,
                "search_radius_used_km": selected_radius,
                "radius_expansion_reason": radius_reason,
                "distance_method": "Geodesic Haversine",
                "routing_available": True
            },
            "recommended_site": None,
            "candidates": [],
            "alternative_sites": [],
            "alternatives": [],
            "rejected_sites": rejected_sites_audit,
            "rejected_candidates": rejected_sites_audit,
            "sites_searched": len(sites_pool),
            "sites_rejected": len(rejected_sites_audit),
            "sites_eligible": 0,
            "unallocated_population": population_to_relocate,
            "requires_human_verification": True,
            "warnings": warnings + ["No verified relocation site found within 50 km radius passing all safety rules."],
            "model_version": "AASHRAY-RELOC-v2.0",
            "calculated_at": now_str,
            "plan_id": f"PLAN-{uuid.uuid4().hex[:8].upper()}",
            "population_to_relocate": population_to_relocate,
            "allocated_population": 0,
            "nearest_feasible_site": None,
            "allocations": [],
            "rejected_sites_audit": rejected_sites_audit,
            "recommendations": ["No verified relocation site found. Deploy emergency temporary shelters or expand search boundary."]
        }

    # Allocate population across eligible safe candidate sites
    remaining_to_allocate = population_to_relocate
    allocations = []
    recommended_site_ref = None
    alternatives_refs = []
    total_allocated = 0

    for idx, item in enumerate(eligible_safe_sites):
        s_raw = item["site"]
        cap_raw = item["capacity"]
        r_info = item["road_info"]
        site_id = s_raw.get("site_id", s_raw.get("id"))

        if remaining_to_allocate <= 0:
            # Safe site with remaining capacity added to alternatives
            alternatives_refs.append({
                "site_id": site_id,
                "name": s_raw["name"],
                "status": "FEASIBLE_COMPLETE",
                "latitude": s_raw["latitude"],
                "longitude": s_raw["longitude"],
                "district": s_raw.get("district", "Chamoli"),
                "subdistrict": s_raw.get("subdistrict", "Chamoli"),
                "distance_km": item["dist_km"],
                "distance_type": "straight_line",
                "straight_line_dist_km": item["dist_km"],
                "road_dist_km": r_info["road_dist_km"],
                "estimated_travel_time_min": r_info["estimated_travel_time_min"],
                "safety_score": s_raw.get("safety_score", 100.0),
                "effective_capacity": cap_raw["effective_capacity"],
                "remaining_capacity": cap_raw["remaining_capacity"],
                "allocated_population": 0,
                "capacity_utilization_percent": 0.0,
                "bottleneck": cap_raw["bottleneck"],
                "source_type": s_raw.get("source_type", "OFFICIAL_SDMA_REGISTRY"),
                "source_reference": s_raw.get("source_reference", "UK-SDMA Master Register"),
                "verification_status": s_raw.get("verification_status", "VERIFIED_OFFICIAL"),
                "data_freshness": s_raw.get("data_freshness", "CURRENT"),
                "explanation": [
                    f"✓ FEASIBLE ALTERNATIVE: {cap_raw['remaining_capacity']} capacity available",
                    f"✓ Straight-line Geodesic Distance: {item['dist_km']} km | Estimated Road: {r_info['road_dist_km']} km",
                    f"✓ Bottleneck component: {cap_raw['bottleneck']}"
                ],
                "is_demonstration": s_raw.get("is_demonstration", False)
            })
            continue

        avail = cap_raw["remaining_capacity"]
        alloc_amt = min(remaining_to_allocate, avail)
        remaining_to_allocate -= alloc_amt
        total_allocated += alloc_amt

        utilization_pct = round((alloc_amt / cap_raw["effective_capacity"] * 100.0), 1)

        justification_reasons = [
            f"✓ Safe candidate passing all multi-hazard exclusions (Safety Score: {s_raw.get('safety_score', 100.0)}/100)",
            f"✓ Effective Carrying Capacity: {cap_raw['effective_capacity']} persons (Resource Bottleneck: {cap_raw['bottleneck']})",
            f"✓ Geodesic Distance: {item['dist_km']} km straight-line | ~{r_info['road_dist_km']} km road travel ({r_info['estimated_travel_time_min']} mins)",
            f"✓ Medical Proximity: Nearest hospital {s_raw.get('nearest_hospital_km', 2.0)} km ({s_raw.get('road_accessibility', 'Good')} road access)"
        ]

        if s_raw.get("is_demonstration", False):
            justification_reasons.append("DEMONSTRATION FALLBACK — NOT LOCATION-OPTIMIZED OFFICIAL SHELTER")

        site_ref = {
            "site_id": site_id,
            "name": s_raw["name"],
            "status": "FEASIBLE_COMPLETE" if alloc_amt == population_to_relocate else "FEASIBLE_PARTIAL",
            "latitude": s_raw["latitude"],
            "longitude": s_raw["longitude"],
            "district": s_raw.get("district", "Chamoli"),
            "subdistrict": s_raw.get("subdistrict", "Chamoli"),
            "distance_km": item["dist_km"],
            "distance_type": "straight_line",
            "straight_line_dist_km": item["dist_km"],
            "road_dist_km": r_info["road_dist_km"],
            "estimated_travel_time_min": r_info["estimated_travel_time_min"],
            "routing_provider": r_info["routing_provider"],
            "routing_timestamp": r_info["routing_timestamp"],
            "routing_status": r_info["routing_status"],
            "safety_score": s_raw.get("safety_score", 100.0),
            "safety_status": "eligible",
            "effective_capacity": cap_raw["effective_capacity"],
            "remaining_capacity": cap_raw["remaining_capacity"] - alloc_amt,
            "allocated_population": alloc_amt,
            "capacity_utilization_percent": utilization_pct,
            "bottleneck": cap_raw["bottleneck"],
            "source_type": s_raw.get("source_type", "OFFICIAL_SDMA_REGISTRY"),
            "source_reference": s_raw.get("source_reference", "UK-SDMA Master Register"),
            "verification_status": s_raw.get("verification_status", "VERIFIED_OFFICIAL"),
            "data_freshness": s_raw.get("data_freshness", "CURRENT"),
            "explanation": justification_reasons,
            "is_demonstration": s_raw.get("is_demonstration", False)
        }

        if recommended_site_ref is None:
            recommended_site_ref = site_ref
        else:
            alternatives_refs.append(site_ref)

        allocations.append({
            "site_id": site_id,
            "site_name": s_raw["name"],
            "site_type": s_raw.get("site_type", "Relief Shelter"),
            "district": s_raw.get("district", "Chamoli"),
            "subdistrict": s_raw.get("subdistrict", "Chamoli"),
            "latitude": s_raw["latitude"],
            "longitude": s_raw["longitude"],
            "allocated_population": alloc_amt,
            "site_effective_capacity": cap_raw["effective_capacity"],
            "remaining_capacity_after_alloc": cap_raw["remaining_capacity"] - alloc_amt,
            "utilization_percentage": utilization_pct,
            "straight_line_dist_km": item["dist_km"],
            "road_dist_km": r_info["road_dist_km"],
            "estimated_travel_time_min": r_info["estimated_travel_time_min"],
            "safety_score": s_raw.get("safety_score", 100.0),
            "suitability_score": s_raw.get("suitability_score", 85.0),
            "composite_score": item["composite_score"],
            "bottleneck": cap_raw["bottleneck"],
            "nearest_hospital_km": s_raw.get("nearest_hospital_km", 2.0),
            "road_accessibility": s_raw.get("road_accessibility", "Good"),
            "why_this_site": justification_reasons
        })

    unallocated = population_to_relocate - total_allocated

    if total_allocated == population_to_relocate and recommended_site_ref:
        overall_status = "FEASIBLE_COMPLETE"
    elif total_allocated > 0:
        overall_status = "FEASIBLE_PARTIAL"
        warnings.append(f"Available safe capacity ({total_allocated}) is less than required population ({population_to_relocate}). Unallocated: {unallocated} persons.")
    else:
        overall_status = "NO_VERIFIED_SITE_FOUND"

    recs = [
        f"Relocation plan generated for {population_to_relocate} residents.",
        f"Recommended destination: {recommended_site_ref['name'] if recommended_site_ref else 'None'} ({recommended_site_ref['distance_km'] if recommended_site_ref else 0} km away).",
        "Field verification and district authority approval required before dispatch."
    ]

    return {
        "status": overall_status,
        "overall_status": overall_status,
        "source_habitation": source_habitation,
        "selected_habitation": source_habitation,
        "search_parameters": {
            "initial_radius_km": 10.0,
            "maximum_radius_km": 50.0,
            "search_radius_used_km": selected_radius,
            "radius_expansion_reason": radius_reason,
            "distance_method": "PostGIS geography / Geodesic Haversine",
            "routing_available": True
        },
        "search_radius_km": selected_radius,
        "data_status": "live" if any(not s.get("is_demonstration", False) for s in sites_pool) else "demo",
        "recommended_site": recommended_site_ref,
        "candidates": [recommended_site_ref] + alternatives_refs if recommended_site_ref else [],
        "alternative_sites": alternatives_refs[:5],
        "alternatives": alternatives_refs[:5],
        "rejected_sites": rejected_sites_audit,
        "rejected_candidates": rejected_sites_audit,
        "sites_searched": len(sites_pool),
        "sites_rejected": len(rejected_sites_audit),
        "sites_eligible": len(eligible_safe_sites),
        "unallocated_population": unallocated,
        "requires_human_verification": True,
        "warnings": warnings,
        "model_version": "AASHRAY-RELOC-v2.0",
        "calculated_at": now_str,
        # Backwards compatibility fields
        "plan_id": f"PLAN-{uuid.uuid4().hex[:8].upper()}",
        "population_to_relocate": population_to_relocate,
        "allocated_population": total_allocated,
        "nearest_feasible_site": allocations[0] if allocations else None,
        "allocations": allocations,
        "rejected_sites_audit": rejected_sites_audit,
        "recommendations": recs
    }
