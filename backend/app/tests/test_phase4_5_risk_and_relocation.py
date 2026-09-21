import pytest
from app.services.risk_service import calculate_location_risk_assessment
from app.services.relocation_service import find_location_relocation_options

def test_risk_formula_transparency_and_structure():
    # Raini Village coordinates
    lat, lon = 30.4852, 79.6914
    assessment = calculate_location_risk_assessment(lat, lon)
    
    assert assessment["formula_version"] == "AASHRAY-RISK-v2.1"
    assert "hazard_components" in assessment
    assert "exposure_components" in assessment
    assert "vulnerability_components" in assessment
    assert "weights" in assessment
    assert "thresholds" in assessment
    assert "evidence_coverage_percent" in assessment
    assert "data_quality_score" in assessment
    assert assessment["model_validation_score"] is None # Honest reporting
    assert "risk_uncertainty" in assessment
    assert "assessment_confidence" in assessment
    assert "validation_status" in assessment
    assert "provenance" in assessment
    assert "limitations" in assessment
    assert isinstance(assessment["limitations"], list)

def test_relocation_hard_safety_constraints():
    # Raini Village coordinates
    lat, lon = 30.4852, 79.6914
    options = find_location_relocation_options(
        latitude=lat,
        longitude=lon,
        population_to_relocate=1250,
        risk_level="CRITICAL"
    )
    
    assert options["status"] in ["FEASIBLE_COMPLETE", "FEASIBLE_PARTIAL", "NO_VERIFIED_SITE_FOUND"]
    assert "search_parameters font_mono" not in options # Schema check
    assert "search_parameters" in options
    
    # Audit rejected sites to ensure safety constraints were evaluated
    rejected = options.get("rejected_sites_audit", [])
    for rej in rejected:
        reason = rej.get("reason", "")
        # Rejection reasons must explicitly cite safety/capacity/distance rules
        assert any(kw in reason for kw in ["Exceeds maximum", "Hazard", "Buffer", "Capacity", "verification", "REJECTED"])

def test_relocation_deterministic_reproducibility():
    lat, lon = 30.4852, 79.6914
    opt1 = find_location_relocation_options(lat, lon, 1000, "CRITICAL")
    opt2 = find_location_relocation_options(lat, lon, 1000, "CRITICAL")
    
    rec1 = opt1.get("recommended_site") or opt1.get("nearest_feasible_site")
    rec2 = opt2.get("recommended_site") or opt2.get("nearest_feasible_site")
    
    if rec1 and rec2:
        assert rec1["site_id"] == rec2["site_id"]
        assert rec1["straight_line_dist_km"] == rec2["straight_line_dist_km"]

def test_kullu_location_integration():
    # Kullu, Himachal Pradesh coordinates
    kullu_lat, kullu_lon = 31.9579, 77.1095
    assessment = calculate_location_risk_assessment(kullu_lat, kullu_lon)
    
    assert assessment["location"]["latitude"] == round(kullu_lat, 6)
    assert assessment["location"]["longitude"] == round(kullu_lon, 6)
    assert assessment["status"] in ["ASSESSED", "PARTIAL", "INSUFFICIENT"]
    
    reloc = find_location_relocation_options(kullu_lat, kullu_lon, 500, "HIGH")
    assert reloc["source_habitation"]["latitude"] == round(kullu_lat, 6)
    assert reloc["source_habitation"]["longitude"] == round(kullu_lon, 6)

def test_no_feasible_site_handling():
    # Mock candidate sites with zero capacity and high hazard
    unsafe_candidates = [
        {
            "site_id": "TEST-UNSAFE-1",
            "name": "Active Landslide Zone Camp",
            "latitude": 30.5000,
            "longitude": 79.7000,
            "is_safe": False,
            "rejection_reason": "REJECTED: Active Landslide Failure Zone",
            "safety_score": 20.0,
            "used_capacity": 500
        }
    ]
    
    res = find_location_relocation_options(
        latitude=30.4852,
        longitude=79.6914,
        population_to_relocate=1000,
        candidate_sites=unsafe_candidates
    )
    
    assert res["status"] in ["NO_VERIFIED_SITE_FOUND", "NO_FEASIBLE_COMPLETE_RELOCATION"]
    assert len(res["rejected_sites_audit"]) >= 1
