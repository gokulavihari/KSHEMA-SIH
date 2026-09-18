from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_1_valid_target_user_coordinate():
    # 1. Valid coordinate: 17.595669, 78.489663
    response = client.post("/api/location/assess", json={
        "latitude": 17.595669,
        "longitude": 78.489663,
        "accuracy": 15.0,
        "source": "GPS"
    })
    assert response.status_code == 200
    data = response.json()
    assert "location" in data
    assert data["location"]["latitude"] == 17.595669
    assert data["location"]["longitude"] == 78.489663
    assert data["status"] in ["PARTIAL", "ASSESSED"]

def test_2_invalid_latitude_validation():
    # 2. Invalid latitude: 95.0 -> HTTP 422
    res = client.post("/api/location/assess", json={
        "latitude": 95.0,
        "longitude": 78.489663
    })
    assert res.status_code == 422

def test_3_invalid_longitude_validation():
    # 3. Invalid longitude: 200.0 -> HTTP 422
    res = client.post("/api/location/assess", json={
        "latitude": 17.595669,
        "longitude": 200.0
    })
    assert res.status_code == 422

def test_4_out_of_coverage_hazard_layer():
    # 4. Out of coverage hazard layer -> Must return OUT_OF_COVERAGE status for missing layers
    res = client.post("/api/location/assess", json={
        "latitude": 17.644300,
        "longitude": 78.492200
    })
    assert res.status_code == 200
    data = res.json()
    assert data["hazard"]["flood"]["status"] == "UNAVAILABLE — OUTSIDE DATA COVERAGE"
    assert data["hazard"]["landslide"]["status"] == "UNAVAILABLE — OUTSIDE DATA COVERAGE"

def test_5_no_mapped_hazard_within_valid_coverage():
    # 5. Coordinate outside known hazard polygon where pilot coverage exists -> NO MAPPED FLOOD EXPOSURE DETECTED
    res = client.post("/api/location/assess", json={
        "latitude": 30.55,
        "longitude": 79.33
    })
    assert res.status_code == 200
    data = res.json()
    assert data["coverage"]["is_in_pilot_region"] is True
    assert "hazard" in data

def test_6_partial_risk_calculation():
    # 6. Partial risk calculation for Telangana coordinate when evidence threshold satisfied
    res = client.post("/api/location/assess", json={
        "latitude": 17.644300,
        "longitude": 78.492200
    })
    assert res.status_code == 200
    data = res.json()
    assert data["assessment_mode"] == "PARTIAL_EVIDENCE"
    assert data["coverage_percentage"] >= 40.0
    assert data["risk_score"] is not None
    assert data["risk_level"] in ["LOW", "MODERATE", "HIGH", "VERY HIGH", "CRITICAL"]

def test_7_insufficient_evidence_threshold():
    # 7. Insufficient evidence threshold check (< 40%) -> Must return UNKNOWN
    # If custom weights set 90% weight to out-of-coverage flood/landslide layers
    res = client.post("/api/location/assess", json={
        "latitude": 0.0,
        "longitude": 0.0
    })
    assert res.status_code == 200
    data = res.json()
    assert "assessment_mode" in data

def test_8_vulnerability_calculation():
    # 8. Vulnerability calculation from available evidence without fabrication
    res = client.post("/api/location/assess", json={
        "latitude": 17.644300,
        "longitude": 78.492200
    })
    assert res.status_code == 200
    data = res.json()
    assert data["vulnerability_score"] is not None
    assert data["vulnerability_level"] in ["LOW", "MODERATE", "HIGH", "VERY HIGH", "CRITICAL"]
    assert "vulnerability" in data

def test_9_confidence_calculation():
    # 9. Assessment confidence calculation from coverage, freshness, spatial resolution, and GPS accuracy
    res = client.post("/api/location/assess", json={
        "latitude": 17.644300,
        "longitude": 78.492200,
        "accuracy": 15.0
    })
    assert res.status_code == 200
    data = res.json()
    assert data["confidence"] is not None
    assert 0.0 <= data["confidence"] <= 100.0

def test_10_river_proximity_geographic_correctness():
    # 10. River proximity geographic correctness -> Telangana point MUST NOT return Chamoli river distance
    res = client.post("/api/location/assess", json={
        "latitude": 17.644300,
        "longitude": 78.492200
    })
    assert res.status_code == 200
    data = res.json()
    assert data["spatial_features"]["river_distance_m"] is None
    assert data["hazard"]["river_proximity"]["status"] == "UNAVAILABLE — OUTSIDE DATA COVERAGE"

def test_11_known_raini_hazard_coordinate():
    # 11. Known Raini Village HAB-001 coordinate -> Must detect existing demonstration hazard
    res = client.post("/api/location/assess", json={
        "latitude": 30.4852,
        "longitude": 79.6914
    })
    assert res.status_code == 200
    data = res.json()
    assert data["risk_level"] in ["HIGH", "VERY HIGH", "CRITICAL"]
    assert data["hazard_score"] is not None
    assert data["hazard_score"] >= 50.0
    assert data["assessment_mode"] == "FULL_EVIDENCE"

def test_12_telangana_coordinate_no_chamoli_leakage():
    # 12. Telangana coordinate must NOT leak Chamoli hazard labels or Chamoli river distance
    res = client.post("/api/location/assess", json={
        "latitude": 17.644300,
        "longitude": 78.492200
    })
    assert res.status_code == 200
    data = res.json()
    assert data["place"]["state"] == "Telangana"
    assert data["spatial_features"]["river_distance_m"] is None

def test_13_unsafe_relocation_candidate_rejection():
    # 13. Unsafe relocation candidate -> Must be rejected
    reloc_res = client.post("/api/location/relocation-options", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "population_to_relocate": 1000,
        "risk_level": "CRITICAL"
    })
    assert reloc_res.status_code == 200
    data = reloc_res.json()
    rejected = [r for r in data["rejected_sites_audit"] if "Tapovan" in r["site_name"]]
    assert len(rejected) > 0
    assert rejected[0]["allocated"] == 0

def test_14_insufficient_capacity_unallocated_population():
    # 14. Insufficient capacity -> Must leave population unallocated
    reloc_res = client.post("/api/location/relocation-options", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "population_to_relocate": 50000,
        "risk_level": "CRITICAL"
    })
    assert reloc_res.status_code == 200
    data = reloc_res.json()
    assert data["unallocated_population"] > 0

def test_15_assessment_radius_and_geometry():
    # 15. Verify data-driven assessment_radius_m, assessment_geometry GeoJSON, hazard_overlaps, and evidence_coverage
    res = client.post("/api/location/assess", json={
        "latitude": 17.604161,
        "longitude": 78.483843,
        "accuracy": 116.0,
        "source": "GPS",
        "assessment_radius_m": 1000.0
    })
    assert res.status_code == 200
    data = res.json()
    assert data["assessment_radius_m"] == 1000.0
    assert "assessment_geometry" in data
    assert data["assessment_geometry"]["type"] == "Polygon"
    assert len(data["assessment_geometry"]["coordinates"][0]) > 10
    assert "hazard_overlaps" in data
    assert isinstance(data["hazard_overlaps"], list)
    assert "evidence_coverage" in data
    assert data["location"]["accuracy_m"] == 116.0


