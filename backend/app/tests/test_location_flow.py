from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_location_resolve_address():
    response = client.post("/api/location/resolve", json={"address": "Raini"})
    assert response.status_code == 200
    data = response.json()
    assert "latitude" in data
    assert "longitude" in data
    assert data["latitude"] == 30.4852
    assert data["longitude"] == 79.6914

def test_location_resolve_medchal():
    response = client.post("/api/location/resolve", json={"address": "Medchal"})
    assert response.status_code == 200
    data = response.json()
    assert "latitude" in data
    assert "longitude" in data
    assert abs(data["latitude"] - 17.604161) < 0.01

def test_location_resolve_coords_string():
    response = client.post("/api/location/resolve", json={"address": "17.385044, 78.486671"})
    assert response.status_code == 200
    data = response.json()
    assert abs(data["latitude"] - 17.385044) < 0.001
    assert abs(data["longitude"] - 78.486671) < 0.001

def test_location_resolve_lat_lon():
    response = client.post("/api/location/resolve", json={"latitude": 30.4852, "longitude": 79.6914})
    assert response.status_code == 200
    data = response.json()
    assert "locality" in data

def test_location_assess_valid():
    response = client.post("/api/location/assess", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "accuracy": 15.0,
        "source": "GPS",
        "assessment_radius_m": 1000.0
    })
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "risk_level" in data
    assert "vulnerability_score" in data

def test_location_relocation_options():
    response = client.post("/api/location/relocation-options", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "population_to_relocate": 1250,
        "risk_level": "CRITICAL"
    })
    assert response.status_code == 200
    data = response.json()
    assert "nearest_feasible_site" in data
