import pytest
from app.services.data_coverage_service import DataCoverageService
from app.data_providers.seismic_provider import get_seismic_hazard_evidence
from app.data_providers.flood_provider import get_flood_hazard_evidence
from app.data_providers.landslide_provider import get_landslide_hazard_evidence
from app.data_providers.shelter_provider import fetch_nationwide_shelter_candidates, classify_shelter_record

def test_data_coverage_evaluation_chamoli():
    res = DataCoverageService.evaluate_location_coverage(30.4852, 79.6914, mode="RESEARCH")
    assert res["location_status"] == "AVAILABLE"
    assert res["coverage_percentage"] >= 90.0
    assert res["evidence_count"] >= 10
    assert "extreme_rainfall" in res["available_layers"]
    assert "seismic_hazard" in res["available_layers"]
    assert "slope_severity" in res["available_layers"]
    assert res["can_generate_risk"] is True

def test_data_coverage_modes():
    strict_res = DataCoverageService.evaluate_location_coverage(30.4852, 79.6914, mode="STRICT_VERIFIED")
    assert strict_res["assessment_mode"] == "STRICT_VERIFIED"

    demo_res = DataCoverageService.evaluate_location_coverage(30.4852, 79.6914, mode="DEMO")
    assert demo_res["assessment_mode"] == "DEMO"
    assert demo_res["can_generate_demo_result"] is True

def test_seismic_hazard_provider():
    seismic = get_seismic_hazard_evidence(30.4852, 79.6914) # Chamoli (Himalayan V)
    assert seismic["value"]["zone"] == "ZONE_V"
    assert seismic["value"]["zone_num"] == 5
    assert seismic["value"]["pga_g"] == 0.36
    assert seismic["source_type"] == "STATIC_REFERENCE"
    assert seismic["verification_status"] == "VERIFIED_OFFICIAL"

    seismic_medchal = get_seismic_hazard_evidence(17.604161, 78.483843)
    assert seismic_medchal["value"]["zone"] == "ZONE_II"

def test_flood_hazard_provider():
    flood = get_flood_hazard_evidence(26.15, 86.50, elevation_m=45.0, slope_degrees=1.2, river_distance_m=120.0)
    assert flood["value"]["in_flood_zone"] is True
    assert flood["value"]["score"] >= 80.0
    assert flood["coverage_status"] == "FULL_COVERAGE"

def test_landslide_hazard_provider():
    landslide = get_landslide_hazard_evidence(30.4852, 79.6914, slope_degrees=38.0, elevation_m=2200.0)
    assert landslide["value"]["in_landslide_zone"] is True
    assert landslide["value"]["score"] >= 80.0

def test_shelter_classification_categories():
    verified_sample = {
        "site_id": "SHELTER-001",
        "name": "District Relief Camp",
        "is_demonstration": False,
        "verification_status": "VERIFIED_OFFICIAL"
    }
    classified_v = classify_shelter_record(verified_sample)
    assert classified_v["category"] == "VERIFIED_SHELTER"
    assert classified_v["capacity_verified"] is True

    osm_sample = {
        "site_id": "OSM-101",
        "name": "Local School Facility",
        "is_demonstration": False,
        "verification_status": "UNVERIFIED"
    }
    classified_osm = classify_shelter_record(osm_sample)
    assert classified_osm["category"] == "POTENTIAL_CANDIDATE"
    assert classified_osm["capacity_verified"] is False
    assert "UNKNOWN" in classified_osm["capacity_notes"]

    demo_sample = {
        "site_id": "DEMO-001",
        "name": "Demo Staging Site",
        "is_demonstration": True,
        "verification_status": "DEMO_ONLY"
    }
    classified_demo = classify_shelter_record(demo_sample)
    assert classified_demo["category"] == "DEMO_SHELTER"

def test_fetch_nationwide_shelters_hyd():
    # Fetch candidate shelters in Hyderabad (outside Chamoli seed pool)
    shelters = fetch_nationwide_shelter_candidates(17.385044, 78.486671, radius_km=50.0)
    assert len(shelters) > 0
    assert any(s["category"] == "POTENTIAL_CANDIDATE" for s in shelters)
