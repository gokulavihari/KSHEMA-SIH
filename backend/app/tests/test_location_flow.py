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

def test_location_select_endpoint():
    response = client.post("/api/location/select", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "source": "PRESET",
        "display_name": "Raini Village, Chamoli"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["latitude"] == 30.4852
    assert data["longitude"] == 79.6914
    assert data["source"] == "PRESET"
    assert data["coverage_status"] == "AVAILABLE"

def test_location_select_invalid_bounds():
    response = client.post("/api/location/select", json={
        "latitude": 120.0,
        "longitude": 79.6914
    })
    assert response.status_code == 422
    assert "latitude (120.0) must be in [-90, 90]" in str(response.json())

def test_location_search_endpoint():
    response = client.get("/api/location/search?q=Joshimath")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "latitude" in data[0]

def test_regression_location_unavailable_fix():
    # Test valid non-pilot selection (Kullu) returns valid location without Chamoli forced fallback
    res = client.post("/api/location/select", json={
        "latitude": 31.9579,
        "longitude": 77.1095,
        "source": "SEARCH",
        "display_name": "Kullu, Himachal Pradesh"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["latitude"] == 31.9579
    assert data["longitude"] == 77.1095
    assert data["source"] == "SEARCH"
    assert data["coverage_status"] == "AVAILABLE"

def test_regression_invalid_coordinates_rejection():
    # Test invalid latitude > 90
    res1 = client.post("/api/location/assess", json={"latitude": 95.0, "longitude": 79.0})
    assert res1.status_code == 422
    
    # Test invalid longitude > 180
    res2 = client.post("/api/location/assess", json={"latitude": 30.0, "longitude": 185.0})
    assert res2.status_code == 422

def test_regression_all_source_types():
    sources = ["GPS", "MANUAL", "MAP", "PRESET", "COORDINATES", "SEARCH"]
    for src in sources:
        res = client.post("/api/location/select", json={
            "latitude": 30.4852,
            "longitude": 79.6914,
            "source": src
        })
        assert res.status_code == 200
        assert res.json()["source"] == src

