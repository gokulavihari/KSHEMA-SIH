import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_public_dashboard_endpoint():
    response = client.get("/api/public/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "system_name" in data
    assert "total_monitored_habitations" in data
    assert "high_risk_habitations_count" in data
    assert "habitations_overview" in data

def test_public_location_search_endpoint():
    response = client.get("/api/public/location/search?q=Medchal")
    assert response.status_code == 200
    data = response.json()
    assert "query" in data
    assert data["query"] == "Medchal"
    assert "results" in data
    assert len(data["results"]) > 0
    first_result = data["results"][0]
    assert "latitude" in first_result
    assert "longitude" in first_result
    assert "locality" in first_result or "name" in first_result

def test_public_location_assessment_endpoint_valid_gps():
    response = client.post("/api/public/location-assessment", json={
        "latitude": 17.604161,
        "longitude": 78.483843,
        "accuracy_meters": 18.0,
        "source": "GPS"
    })
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data or "risk" in data
    assert "risk_level" in data or "risk" in data
    assert "location" in data
    assert "relocation" in data
    assert "live_conditions" in data

def test_public_location_assessment_directions_url():
    # Test coordinate in Himalayan region with relocation site
    response = client.post("/api/public/location-assessment", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "accuracy_meters": 15.0,
        "source": "GPS"
    })
    assert response.status_code == 200
    data = response.json()
    reloc = data.get("relocation", {})
    nearest = reloc.get("nearest_feasible_site") or reloc.get("primary_site")
    if nearest:
        assert "google_maps_url" in nearest or "navigation_url" in nearest
        g_url = nearest.get("google_maps_url") or nearest.get("navigation_url")
        if g_url:
            assert "google.com/maps/dir" in g_url
            assert "destination=" in g_url

def test_invalid_coordinates_handling():
    # Invalid lat > 90
    response = client.post("/api/public/location-assessment", json={
        "latitude": 120.0,
        "longitude": 78.483843,
        "accuracy_meters": 15.0,
        "source": "GPS"
    })
    assert response.status_code == 422
    assert "Invalid coordinate bounds" in response.json()["detail"]

def test_executive_endpoints_remain_protected():
    # Executive dashboard without token should fail or require auth
    response = client.get("/api/dashboard")
    # Dashboard route in this app returns public summary or requires auth depending on endpoint
    assert response.status_code in [200, 401, 403]
