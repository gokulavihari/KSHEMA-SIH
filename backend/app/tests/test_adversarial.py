import pytest
from app.services.hazard_engine import calculate_hazard_scores, generate_red_zones
from app.services.risk_engine import calculate_habitation_risk
from app.services.vulnerability_engine import calculate_vulnerability_and_priority
from app.services.capacity_engine import calculate_site_capacity
from app.services.relocation_optimizer import generate_relocation_plan
from app.services.simulation_engine import run_extreme_rainfall_simulation

def test_at_risk_normalization():
    """AT-RISK-01: All risk outputs must clamp strictly between 0.0 and 100.0"""
    hab = {
        "raw_landslide": 120.0, # out of bounds raw
        "raw_flood": 150.0,
        "raw_slope": 50.0,
        "river_dist_m": 10.0,
        "historical_disaster_count": 10,
        "population": 10000,
        "housing_vulnerability_score": 100.0,
        "road_access_quality": "Isolated"
    }
    res = calculate_habitation_risk(hab)
    assert 0.0 <= res["risk_score"] <= 100.0

def test_at_capacity_bottleneck():
    """AT-CAP-01: Capacity engine must pick minimum component as effective capacity and flag bottleneck"""
    site = {
        "land_area_sqm": 45000.0, # 4500
        "water_lpd": 450000,     # 4500
        "sanitation_cap": 4000,
        "healthcare_cap": 2500,  # MINIMUM (BOTTLENECK)
        "education_cap": 3500,
        "road_cap": 5000,
        "emergency_cap": 4500
    }
    cap_info = calculate_site_capacity(site)
    assert cap_info["effective_capacity"] == 2500
    assert cap_info["bottleneck"] == "Healthcare Access"

def test_mandatory_step12_case1_unsafe_rejection():
    """
    STEP 12 MANDATORY TEST CASE 1:
    Population = 5,000.
    Site A: safe, capacity = 2,000
    Site B: safe, capacity = 1,500
    Site C: UNSAFE, capacity = 10,000
    
    EXPECTED:
    A = 2000, B = 1500, C = 0.
    Unallocated = 1500.
    System MUST NOT allocate anybody to Site C despite its 10k capacity!
    Status MUST indicate NO FEASIBLE COMPLETE RELOCATION.
    """
    hab = {
        "id": "HAB-TEST-5000",
        "name": "Step 12 Settlement",
        "latitude": 30.5,
        "longitude": 79.5,
        "population": 5000,
        "risk_level": "CRITICAL"
    }
    
    test_sites = [
        {
            "id": "SITE-A",
            "name": "Site A",
            "latitude": 30.4,
            "longitude": 79.4,
            "is_safe": True,
            "safety_score": 90.0,
            "suitability_score": 85.0,
            "land_area_sqm": 20000.0, "water_lpd": 200000, "sanitation_cap": 2000,
            "healthcare_cap": 2000, "education_cap": 2000, "road_cap": 2000, "emergency_cap": 2000,
            "nearest_hospital_km": 2.0, "nearest_school_km": 1.0, "road_accessibility": "Good"
        },
        {
            "id": "SITE-B",
            "name": "Site B",
            "latitude": 30.45,
            "longitude": 79.45,
            "is_safe": True,
            "safety_score": 85.0,
            "suitability_score": 80.0,
            "land_area_sqm": 15000.0, "water_lpd": 150000, "sanitation_cap": 1500,
            "healthcare_cap": 1500, "education_cap": 1500, "road_cap": 1500, "emergency_cap": 1500,
            "nearest_hospital_km": 3.0, "nearest_school_km": 1.5, "road_accessibility": "Good"
        },
        {
            "id": "SITE-C (UNSAFE)",
            "name": "Site C (Unsafe)",
            "latitude": 30.49,
            "longitude": 79.63,
            "is_safe": False,
            "safety_score": 10.0,
            "suitability_score": 10.0,
            "rejection_reason": "REJECTED: Unsafe Hazard Zone",
            "land_area_sqm": 100000.0, "water_lpd": 1000000, "sanitation_cap": 10000,
            "healthcare_cap": 10000, "education_cap": 10000, "road_cap": 10000, "emergency_cap": 10000,
            "nearest_hospital_km": 15.0, "nearest_school_km": 10.0, "road_accessibility": "Poor"
        }
    ]
    
    plan = generate_relocation_plan(hab, test_sites, target_population_override=5000)
    
    alloc_map = {a["site_id"]: a["allocated_population"] for a in plan["allocations"]}
    
    assert alloc_map.get("SITE-A", 0) == 2000
    assert alloc_map.get("SITE-B", 0) == 1500
    assert alloc_map.get("SITE-C (UNSAFE)", 0) == 0 # STRICT REJECTION
    assert plan["unallocated_population"] == 1500
    assert "NO_FEASIBLE_COMPLETE_RELOCATION" in plan["status"] or "FEASIBLE_PARTIAL" in plan["status"]

def test_mandatory_step12_case2_partial_fill():
    """
    STEP 12 MANDATORY TEST CASE 2:
    Population = 2,850.
    Site A = 2,000 capacity
    Site B = 1,200 capacity
    
    EXPECTED:
    A = 2000
    B = 850
    Unallocated = 0
    Status = FEASIBLE_COMPLETE
    """
    hab = {
        "id": "HAB-TEST-2850",
        "name": "Step 12 Settlement 2",
        "latitude": 30.5,
        "longitude": 79.5,
        "population": 2850,
        "risk_level": "HIGH"
    }
    
    test_sites = [
        {
            "id": "SITE-A",
            "name": "Site A",
            "latitude": 30.48,
            "longitude": 79.48,
            "is_safe": True,
            "safety_score": 90.0,
            "suitability_score": 85.0,
            "land_area_sqm": 20000.0, "water_lpd": 200000, "sanitation_cap": 2000,
            "healthcare_cap": 2000, "education_cap": 2000, "road_cap": 2000, "emergency_cap": 2000,
            "nearest_hospital_km": 2.0, "nearest_school_km": 1.0, "road_accessibility": "Good"
        },
        {
            "id": "SITE-B",
            "name": "Site B",
            "latitude": 30.40,
            "longitude": 79.40,
            "is_safe": True,
            "safety_score": 85.0,
            "suitability_score": 80.0,
            "land_area_sqm": 12000.0, "water_lpd": 120000, "sanitation_cap": 1200,
            "healthcare_cap": 1200, "education_cap": 1200, "road_cap": 1200, "emergency_cap": 1200,
            "nearest_hospital_km": 3.0, "nearest_school_km": 1.5, "road_accessibility": "Good"
        }
    ]
    
    plan = generate_relocation_plan(hab, test_sites, target_population_override=2850)
    
    alloc_map = {a["site_id"]: a["allocated_population"] for a in plan["allocations"]}
    
    assert alloc_map.get("SITE-A", 0) == 2000
    assert alloc_map.get("SITE-B", 0) == 850
    assert plan["unallocated_population"] == 0
    assert plan["status"] == "FEASIBLE_COMPLETE"

def test_extreme_rainfall_simulation():
    """Verify that extreme rainfall increases population at risk and red zone area"""
    sim = run_extreme_rainfall_simulation(2.5)
    assert sim["after_metrics"]["population_at_risk"] >= sim["before_metrics"]["population_at_risk"]
    assert sim["after_metrics"]["red_zone_area_sqkm"] > sim["before_metrics"]["red_zone_area_sqkm"]
