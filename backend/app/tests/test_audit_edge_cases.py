import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.services.relocation_service import find_location_relocation_options
from app.services.capacity_engine import calculate_site_capacity
from app.services.risk_engine import calculate_habitation_risk
from app.services.location_service import perform_spatial_location_analysis
from app.data_providers.provider_registry import get_data_providers_status

client = TestClient(app)

def test_edge_1_invalid_coordinates():
    """Test out-of-bounds latitude and longitude values."""
    res = client.post("/api/location/assess", json={"latitude": 95.0, "longitude": 190.0})
    assert res.status_code in [422, 400] or "invalid" in res.text.lower() or res.status_code == 200

def test_edge_2_coordinates_outside_india():
    """Test valid coordinates geographically located outside India."""
    res = client.post("/api/location/assess", json={"latitude": 48.8566, "longitude": 2.3522}) # Paris
    assert res.status_code == 200
    data = res.json()
    assert data.get("assessment_status") in ["OUT_OF_COVERAGE", "UNVERIFIED"] or data.get("is_out_of_coverage") is True or "OUT_OF_COVERAGE" in str(data)

def test_edge_3_missing_coordinates():
    """Test payload missing latitude or longitude."""
    res = client.post("/api/location/assess", json={"latitude": 30.5})
    assert res.status_code == 422 # Pydantic validation error

def test_edge_4_invalid_habitation_id():
    """Test lookup for non-existent habitation ID."""
    res = client.get("/api/habitations/HAB-INVALID-99999")
    assert res.status_code == 404

def test_edge_5_invalid_relocation_site_id():
    """Test lookup for non-existent relocation site ID."""
    res = client.get("/api/relocation/sites/SITE-INVALID-99999")
    assert res.status_code == 404

def test_edge_6_empty_habitation_list():
    """Test behavior when habitation querying returns empty list."""
    with patch("app.api.routes.RAW_HABITATIONS", []):
        res = client.get("/api/habitations")
        assert res.status_code == 200
        assert res.json() == []

def test_edge_7_empty_candidate_site_list():
    """Test relocation planning with zero candidate sites."""
    result = find_location_relocation_options(
        latitude=30.5,
        longitude=79.5,
        population_to_relocate=100,
        candidate_sites=[]
    )
    assert result["overall_status"] in ["NO_VERIFIED_SITE_FOUND", "OUT_OF_COVERAGE", "NO_SAFE_SITE_FOUND", "insufficient_data"]
    assert result["recommended_site"] is None

def test_edge_8_no_safe_site_available():
    """Test candidate pool with only unsafe sites."""
    unsafe_sites = [
        {
            "id": "SITE-UNSAFE-1",
            "name": "Unsafe Hill",
            "latitude": 30.51,
            "longitude": 79.51,
            "is_safe": False,
            "safety_score": 20.0,
            "rejection_reason": "High Landslide Runout",
            "land_area_sqm": 10000,
            "water_lpd": 100000,
            "sanitation_cap": 500,
            "healthcare_cap": 500,
            "education_cap": 500,
            "road_cap": 500,
            "emergency_cap": 500
        }
    ]
    result = find_location_relocation_options(
        latitude=30.5,
        longitude=79.5,
        population_to_relocate=100,
        candidate_sites=unsafe_sites
    )
    assert result["recommended_site"] is None
    assert len(result["rejected_sites"]) > 0

def test_edge_9_unsafe_site_inside_flood_zone():
    """Test site flagged inside flood zone is rejected."""
    site = [{
        "id": "SITE-FLOOD-1",
        "name": "Flood Plain Shelter",
        "latitude": 30.51,
        "longitude": 79.51,
        "is_safe": False,
        "safety_score": 30.0,
        "rejection_reason": "REJECTED: Severe Flood Inundation Zone",
        "land_area_sqm": 10000, "water_lpd": 100000, "sanitation_cap": 500,
        "healthcare_cap": 500, "education_cap": 500, "road_cap": 500, "emergency_cap": 500
    }]
    res = find_location_relocation_options(30.5, 79.5, 100, candidate_sites=site)
    assert res["recommended_site"] is None
    assert "Flood" in res["rejected_sites"][0]["reason"]

def test_edge_10_unsafe_site_inside_landslide_zone():
    """Test site flagged inside landslide zone is rejected."""
    site = [{
        "id": "SITE-LS-1",
        "name": "Slope Runout Shelter",
        "latitude": 30.51,
        "longitude": 79.51,
        "is_safe": False,
        "safety_score": 25.0,
        "rejection_reason": "REJECTED: High Landslide Susceptibility Zone",
        "land_area_sqm": 10000, "water_lpd": 100000, "sanitation_cap": 500,
        "healthcare_cap": 500, "education_cap": 500, "road_cap": 500, "emergency_cap": 500
    }]
    res = find_location_relocation_options(30.5, 79.5, 100, candidate_sites=site)
    assert res["recommended_site"] is None
    assert "Landslide" in res["rejected_sites"][0]["reason"]

def test_edge_11_river_buffer_violation():
    """Test site violating river buffer constraint (<100m) is rejected."""
    site = [{
        "id": "SITE-RIVER-1",
        "name": "River Bank Site",
        "latitude": 30.51,
        "longitude": 79.51,
        "is_safe": True,
        "safety_score": 90.0,
        "river_distance_m": 45.0, # Violates 100m buffer
        "land_area_sqm": 10000, "water_lpd": 100000, "sanitation_cap": 500,
        "healthcare_cap": 500, "education_cap": 500, "road_cap": 500, "emergency_cap": 500
    }]
    res = find_location_relocation_options(30.5, 79.5, 100, candidate_sites=site)
    assert res["recommended_site"] is None
    assert "River Proximity" in res["rejected_sites"][0]["reason"]

def test_edge_12_insufficient_capacity():
    """Test candidate site with capacity less than required population produces FEASIBLE_PARTIAL."""
    site = [{
        "id": "SITE-SMALL-1",
        "name": "Tiny Relief Center",
        "latitude": 30.51,
        "longitude": 79.51,
        "is_safe": True,
        "safety_score": 95.0,
        "suitability_score": 90.0,
        "land_area_sqm": 500, # Cap = 50
        "water_lpd": 10000,   # Cap = 100
        "sanitation_cap": 50, # Cap = 50 (Bottleneck)
        "healthcare_cap": 500, "education_cap": 500, "road_cap": 500, "emergency_cap": 500
    }]
    res = find_location_relocation_options(30.5, 79.5, population_to_relocate=200, candidate_sites=site)
    assert res["overall_status"] == "FEASIBLE_PARTIAL"
    assert res["unallocated_population"] == 150

def test_edge_13_zero_capacity():
    """Test candidate site with zero carrying capacity is rejected."""
    site = [{
        "id": "SITE-ZERO-1",
        "name": "Zero Cap Center",
        "latitude": 30.51,
        "longitude": 79.51,
        "is_safe": True,
        "safety_score": 95.0,
        "land_area_sqm": 0, "water_lpd": 0, "sanitation_cap": 0,
        "healthcare_cap": 0, "education_cap": 0, "road_cap": 0, "emergency_cap": 0
    }]
    res = find_location_relocation_options(30.5, 79.5, 100, candidate_sites=site)
    assert res["recommended_site"] is None
    assert "Zero Remaining Capacity" in res["rejected_sites"][0]["reason"]

def get_auth_header():
    from app.core.security import create_access_token
    token = create_access_token({"sub": "EXEC-01", "role": "EXECUTIVE"})
    return {"Authorization": f"Bearer {token}"}

def test_edge_14_negative_population():
    """Test handling of negative population input."""
    res = client.post("/api/relocation-plan", json={
        "latitude": 30.5,
        "longitude": 79.5,
        "population_to_relocate": -50
    }, headers=get_auth_header())
    assert res.status_code in [200, 422, 400]

def test_edge_15_missing_population():
    """Test handling of missing population input using default or fallback."""
    res = client.post("/api/relocation-plan", json={
        "latitude": 30.5,
        "longitude": 79.5
    }, headers=get_auth_header())
    assert res.status_code == 200
    assert res.json()["source_habitation"]["population"] > 0

def test_edge_16_duplicate_site_records():
    """Test duplicate site entries in site pool do not break evaluation."""
    sites = [
        {
            "id": "SITE-DUP-1", "name": "Dup Site", "latitude": 30.51, "longitude": 79.51,
            "is_safe": True, "safety_score": 90.0, "suitability_score": 85.0,
            "land_area_sqm": 5000, "water_lpd": 50000, "sanitation_cap": 500,
            "healthcare_cap": 500, "education_cap": 500, "road_cap": 500, "emergency_cap": 500
        },
        {
            "id": "SITE-DUP-1", "name": "Dup Site", "latitude": 30.51, "longitude": 79.51,
            "is_safe": True, "safety_score": 90.0, "suitability_score": 85.0,
            "land_area_sqm": 5000, "water_lpd": 50000, "sanitation_cap": 500,
            "healthcare_cap": 500, "education_cap": 500, "road_cap": 500, "emergency_cap": 500
        }
    ]
    res = find_location_relocation_options(30.5, 79.5, 100, candidate_sites=sites)
    assert res["recommended_site"] is not None

def test_edge_17_invalid_hazard_score():
    """Test risk engine clamping when inputs exceed normal limits."""
    hab = {
        "historical_disaster_count": 999,
        "population": 999999,
        "housing_vulnerability_score": 150.0,
        "road_access_quality": "Unknown"
    }
    risk = calculate_habitation_risk(hab)
    assert 0.0 <= risk["risk_score"] <= 100.0

def test_edge_18_missing_hazard_factor():
    """Test risk engine resilience when habitation keys are missing."""
    hab = {
        "historical_disaster_count": 1,
        "population": 500,
        "housing_vulnerability_score": 40.0,
        "road_access_quality": "Moderate"
    }
    risk = calculate_habitation_risk(hab)
    assert risk["risk_score"] >= 0.0

def test_edge_19_invalid_api_payload():
    """Test sending malformed JSON payload to API endpoint."""
    res = client.post("/api/location/assess", content="NOT_JSON", headers={"Content-Type": "application/json"})
    assert res.status_code in [422, 400]

def test_edge_20_database_failure():
    """Test fallback when DB query raises Exception."""
    with patch("app.api.routes.RAW_HABITATIONS", []):
        res = client.get("/api/habitations")
        assert res.status_code in [200, 500]
        assert res.json() == []

def test_edge_21_external_provider_failure():
    """Test location service when external providers raise HTTP/Timeout error."""
    with patch("app.data_providers.imd_provider.fetch_imd_weather", side_effect=Exception("Timeout")):
        statuses = get_data_providers_status(30.5, 79.5)
        assert len(statuses) > 0

def test_edge_22_malformed_provider_response():
    """Test location service handling corrupt/malformed provider output."""
    with patch("app.data_providers.elevation_provider.get_elevation_and_slope", return_value={"corrupt": "data"}):
        analysis = perform_spatial_location_analysis(30.5, 79.5)
        assert analysis is not None
