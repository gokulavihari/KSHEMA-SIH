import json
import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.risk_service import calculate_location_risk_assessment
from app.services.location_service import perform_spatial_location_analysis, get_seismic_zone_info

client = TestClient(app)

REGRESSION_CASES_FILE = os.path.join(os.path.dirname(__file__), "data", "location_regression_cases.json")

def load_regression_cases():
    with open(REGRESSION_CASES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

class TestLocationSensitivityAndAudit:

    def test_coordinate_validation_invalid_bounds(self):
        """Verify API rejects invalid latitude/longitude out of range."""
        res_lat_low = client.post("/api/location/assess", json={"latitude": -95.0, "longitude": 79.5})
        assert res_lat_low.status_code == 422
        
        res_lon_high = client.post("/api/location/assess", json={"latitude": 30.0, "longitude": 190.0})
        assert res_lon_high.status_code == 422

    def test_coordinate_validation_non_numeric(self):
        """Verify API rejects non-numeric coordinate strings."""
        res = client.post("/api/location/assess", json={"latitude": "invalid", "longitude": 79.5})
        assert res.status_code == 422

    def test_coordinate_forwarding_and_response_schema(self):
        """Verify coordinates in request payload reach backend and match response metadata."""
        lat, lon = 26.13, 86.60
        res = client.post("/api/location/assess", json={"latitude": lat, "longitude": lon, "source": "MANUAL_CLICK"})
        assert res.status_code == 200
        data = res.json()
        assert data["location"]["latitude"] == lat
        assert data["location"]["longitude"] == lon
        assert data["location"]["source"] == "MANUAL_CLICK"
        assert "risk_score" in data
        assert "risk_level" in data
        assert "data_provenance" in data
        assert "debug_info" in data

    def test_no_universal_25_moderate_fallback(self):
        """
        REGRESSION TEST FOR THE '25 MODERATE' BUG:
        Verify that testing multiple distinct locations across India does NOT result in 
        all locations returning a hardcoded ~25 Moderate score.
        """
        cases = load_regression_cases()
        scores = []
        for case in cases:
            res = client.post("/api/location/assess", json={"latitude": case["latitude"], "longitude": case["longitude"]})
            assert res.status_code == 200
            data = res.json()
            score = data["risk_score"]
            scores.append(score)

        # Ensure scores are non-identical and cover a range across different regions
        assert len(set(scores)) > 3, f"Location risk scores collapsed into too few distinct values: {scores}"
        # Ensure not all locations return 25.0 or 25.2
        count_25 = sum(1 for s in scores if 24.5 <= s <= 25.5)
        assert count_25 < len(cases) // 2, f"Too many locations returning ~25 Moderate score: {scores}"

    def test_coordinate_pair_sensitivity_pair1(self):
        """Compare Pair 1: Joshimath (30.56, 79.56) vs Rajamahendravaram (17.00, 81.78)."""
        res_a = calculate_location_risk_assessment(30.56, 79.56)
        res_b = calculate_location_risk_assessment(17.00, 81.78)
        
        assert res_a["spatial_features"]["slope_degrees"] != res_b["spatial_features"]["slope_degrees"]
        assert res_a["spatial_features"]["elevation_m"] > res_b["spatial_features"]["elevation_m"]
        assert res_a["risk_score"] != res_b["risk_score"]

    def test_coordinate_pair_sensitivity_pair2(self):
        """Compare Pair 2: Wayanad (11.60, 76.10) vs Bhuj (23.24, 69.67)."""
        res_a = calculate_location_risk_assessment(11.60, 76.10)
        res_b = calculate_location_risk_assessment(23.24, 69.67)
        
        score_a = res_a["hazard"]["landslide"]["score"] or 0.0
        score_b = res_b["hazard"]["landslide"]["score"] or 0.0
        assert score_a > score_b
        assert res_b["hazard"]["seismic"]["score"] >= 80.0 # Bhuj in Zone V

    def test_coordinate_pair_sensitivity_pair3(self):
        """Compare Pair 3: Supaul (26.13, 86.60) vs Musi River Hyderabad (17.37, 78.48)."""
        res_a = calculate_location_risk_assessment(26.13, 86.60)
        res_b = calculate_location_risk_assessment(17.37, 78.48)
        
        assert res_a["hazard"]["seismic"]["zone"] == "ZONE_V"
        assert res_b["hazard"]["seismic"]["zone"] == "ZONE_II"
        assert res_a["risk_score"] > res_b["risk_score"]

    def test_seismic_zone_is1893_lookup(self):
        """Verify BIS IS 1893 seismic zone classification logic."""
        kutch = get_seismic_zone_info(23.24, 69.67)
        assert kutch["zone"] == "ZONE_V"
        
        bihar = get_seismic_zone_info(26.13, 86.60)
        assert bihar["zone"] == "ZONE_V"
        
        hyd = get_seismic_zone_info(17.37, 78.48)
        assert hyd["zone"] == "ZONE_II"

    def test_mosdac_unconfigured_credentials_behavior(self):
        """Verify ISRO MOSDAC unconfigured credentials return UNAVAILABLE without fake values."""
        res = client.post("/api/location/assess", json={"latitude": 30.56, "longitude": 79.56})
        assert res.status_code == 200
        data = res.json()
        lc = data["live_conditions"]
        assert "mosdac_status" in lc
        assert lc["mosdac_status"] in ["UNAVAILABLE", "LIVE"]
        if lc["mosdac_status"] == "UNAVAILABLE":
            assert lc["mosdac_rainfall_mm"] is None or lc["mosdac_rainfall_mm"] == 0.0

    def test_developer_debug_mode_output(self):
        """Verify debug_info structure is returned when debug=True query parameter is passed."""
        res = client.post("/api/location/assess?debug=true", json={"latitude": 30.56, "longitude": 79.56})
        assert res.status_code == 200
        data = res.json()
        assert "debug_info" in data
        debug = data["debug_info"]
        assert debug["model_version"] in ["AASHRAY-RISK-v2.0", "AASHRAY-RISK-v2.1"]
        assert "renormalized_risk_score" in debug
        assert "classification_thresholds" in debug
        assert "configured_weights" in debug
        assert "missing_layer_warnings" in debug

    def test_all_10_regression_locations(self):
        """Execute test suite across all 10 location regression cases."""
        cases = load_regression_cases()
        for c in cases:
            res = client.post("/api/location/assess", json={"latitude": c["latitude"], "longitude": c["longitude"]})
            assert res.status_code == 200, f"Failed for {c['location_name']}"
            data = res.json()
            assert data["risk_score"] is not None, f"Risk score None for {c['location_name']}"
            assert data["hazard"]["seismic"]["zone"] == c["expected_seismic_zone"], f"Seismic zone mismatch for {c['location_name']}"
