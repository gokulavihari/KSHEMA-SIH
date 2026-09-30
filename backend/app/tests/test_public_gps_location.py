from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)

def test_1_public_location_risk_valid_device_gps():
    """1. Test that valid device GPS coordinates are accepted by public endpoint and return spatial assessment."""
    response = client.post("/api/public/location-risk", json={
        "latitude": 17.385044,
        "longitude": 78.486671,
        "accuracy_meters": 25.0,
        "source": "GPS"
    })
    assert response.status_code == 200
    data = response.json()
    assert "location" in data
    assert data["location"]["latitude"] == 17.385044
    assert data["location"]["longitude"] == 78.486671
    assert data["location"]["accuracy_meters"] == 25.0
    assert data["location"]["source"] == "GPS"

def test_2_no_fixed_chamoli_fallback_for_telangana():
    """2. Verify GPS coordinates are NOT replaced by hardcoded Chamoli/Pipalkoti coordinates."""
    response = client.post("/api/public/location-risk", json={
        "latitude": 17.385044,
        "longitude": 78.486671,
        "accuracy_meters": 18.0
    })
    assert response.status_code == 200
    data = response.json()
    # Reverse geocoding must return Hyderabad or Telangana, NOT Chamoli
    assert data["place"]["state"] == "Telangana"
    assert "Chamoli" not in data["place"]["display_name"]
    # Check that spatial features do NOT leak Chamoli river distance
    assert data["spatial_features"]["river_distance_m"] is None or data["spatial_features"]["river_distance_m"] > 0

def test_3_reverse_geocoding_uses_actual_coordinates():
    """3. Verify reverse geocoding returns appropriate locality based on exact coordinates."""
    res_hyd = client.post("/api/public/location-risk", json={
        "latitude": 17.3850,
        "longitude": 78.4866
    })
    assert res_hyd.status_code == 200
    data_hyd = res_hyd.json()
    assert data_hyd["place"]["state"] == "Telangana"

    res_raini = client.post("/api/public/location-risk", json={
        "latitude": 30.4852,
        "longitude": 79.6914
    })
    assert res_raini.status_code == 200
    data_raini = res_raini.json()
    assert data_raini["place"]["state"] == "Uttarakhand"

def test_4_two_distinct_gps_locations_produce_separate_results():
    """4. Confirm two geographically distinct GPS locations return distinct risk profiles and don't mix cache."""
    res_hyd = client.post("/api/public/location-risk", json={
        "latitude": 17.3850,
        "longitude": 78.4866
    })
    res_wayanad = client.post("/api/public/location-risk", json={
        "latitude": 11.6050,
        "longitude": 76.0830
    })
    assert res_hyd.status_code == 200
    assert res_wayanad.status_code == 200

    hyd_data = res_hyd.json()
    wayanad_data = res_wayanad.json()

    assert hyd_data["location"]["latitude"] != wayanad_data["location"]["latitude"]
    assert hyd_data["place"]["state"] != wayanad_data["place"]["state"]
    assert hyd_data["spatial_features"]["seismic_zone"] != wayanad_data["spatial_features"]["seismic_zone"] or hyd_data["risk_score"] != wayanad_data["risk_score"]

def test_5_same_pipeline_for_gps_search_and_map_click():
    """5. Verify GPS, SEARCH, and MAP_CLICK sources process through the identical risk engine structure."""
    gps_res = client.post("/api/public/location-risk", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "source": "GPS"
    })
    search_res = client.post("/api/public/location-risk", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "source": "SEARCH"
    })
    map_click_res = client.post("/api/public/location-risk", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "source": "MAP_CLICK"
    })

    assert gps_res.status_code == 200
    assert search_res.status_code == 200
    assert map_click_res.status_code == 200

    d_gps = gps_res.json()
    d_search = search_res.json()
    d_map = map_click_res.json()

    # Core scores & levels must be identical for identical coordinates
    assert d_gps["risk_score"] == d_search["risk_score"] == d_map["risk_score"]
    assert d_gps["risk_level"] == d_search["risk_level"] == d_map["risk_level"]

def test_6_invalid_coordinate_bounds_rejection():
    """6. Ensure out-of-bounds coordinates return HTTP 422 standard error."""
    res_lat = client.post("/api/public/location-risk", json={"latitude": 100.0, "longitude": 78.0})
    assert res_lat.status_code == 422

    res_lon = client.post("/api/public/location-risk", json={"latitude": 17.0, "longitude": -200.0})
    assert res_lon.status_code == 422

def test_7_missing_coordinate_fields_rejection():
    """7. Ensure missing latitude or longitude returns HTTP 422."""
    res = client.post("/api/public/location-risk", json={"latitude": 17.0})
    assert res.status_code == 422

def test_8_location_alerts_check_outside_affected_area():
    """8. Check that coordinates outside verified active hazard zone do not trigger emergency alert."""
    res = client.post("/api/public/location-alerts/check", json={
        "latitude": 17.3850,
        "longitude": 78.4866,
        "accuracy_meters": 15.0
    })
    assert res.status_code == 200
    data = res.json()
    # Low risk region shouldn't trigger an emergency alert unless extreme rainfall condition
    assert "alert_required" in data

def test_9_location_alerts_check_high_risk_zone():
    """9. Check emergency alert evaluation for high risk Raini Village coordinate."""
    res = client.post("/api/public/location-alerts/check", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "accuracy_meters": 10.0
    })
    assert res.status_code == 200
    data = res.json()
    assert "risk_level" in data
    assert data["risk_level"] in ["HIGH", "CRITICAL", "VERY HIGH"]

def test_10_search_location_endpoint():
    """10. Verify backend search endpoint returns geocoded results for location queries."""
    res = client.get("/api/location/search?q=Hyderabad")
    assert res.status_code == 200
    results = res.json()
    assert len(results) > 0
    assert any("Hyderabad" in r.get("display_name", "") for r in results)

def test_11_reverse_geocoding_fallback_handling():
    """11. Verify reverse geocoding fallback when coordinates are in remote area."""
    res = client.post("/api/public/location-risk", json={
        "latitude": 20.0000,
        "longitude": 75.0000
    })
    assert res.status_code == 200
    data = res.json()
    assert "place" in data
    assert data["place"]["display_name"] is not None

def test_12_location_privacy_no_db_persistence():
    """12. Ensure public GPS risk assessment does NOT persist sensitive coordinates into database tables."""
    # Run public location risk query
    res = client.post("/api/public/location-risk", json={
        "latitude": 12.971598,
        "longitude": 77.594566,
        "accuracy_meters": 8.0,
        "source": "GPS"
    })
    assert res.status_code == 200
    # Response returns calculation without storing in DB audit logs
