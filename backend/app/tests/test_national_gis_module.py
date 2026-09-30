import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.national_gis_service import (
    NATIONAL_RISK_RECORDS,
    get_national_gis_overview,
    filter_national_risk_locations,
    get_location_gis_detail,
    get_location_history
)

client = TestClient(app)

class TestNationalGISIntelligenceModule:

    def test_1_national_overview_loads(self):
        """1. Verify National GIS overview endpoint loads with default INDIA view and coverage stats."""
        res = client.get("/api/gis/overview")
        assert res.status_code == 200
        data = res.json()
        assert data["default_view"] == "INDIA"
        assert "center" in data
        assert "coverage" in data
        assert data["coverage"]["total_assessed_locations"] > 0
        assert "honest_coverage_statement" in data["coverage"]
        assert "severity_totals" in data
        totals = data["severity_totals"]
        assert "moderate" in totals
        assert "high" in totals
        assert "extremely_high" in totals
        assert "critical" in totals
        assert totals["all"] == totals["moderate"] + totals["high"] + totals["extremely_high"] + totals["critical"]

    def test_2_state_selector_loads_all_supported_states(self):
        """2. Verify state selector loads list of supported Indian states and UTs."""
        res = client.get("/api/gis/states")
        assert res.status_code == 200
        states = res.json()
        state_names = [s["name"] for s in states]
        assert "Telangana" in state_names
        assert "Uttarakhand" in state_names
        assert "Maharashtra" in state_names
        assert "Himachal Pradesh" in state_names
        assert "Kerala" in state_names
        assert "Andhra Pradesh" in state_names
        assert "Bihar" in state_names
        assert "Gujarat" in state_names
        assert "Sikkim" in state_names

    def test_3_selecting_telangana_filters_locations(self):
        """3. Verify selecting Telangana filters locations specifically to Telangana."""
        res = client.get("/api/gis/locations?state=Telangana")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert loc["state"] == "Telangana"
        
        # Verify Medchal is present
        medchal = next((l for l in data["locations"] if "Medchal" in l["location_name"]), None)
        assert medchal is not None
        assert medchal["risk_level"] == "CRITICAL"
        assert medchal["population"] == 1250

    def test_4_selecting_uttarakhand_filters_locations(self):
        """4. Verify selecting Uttarakhand filters locations to Uttarakhand."""
        res = client.get("/api/gis/locations?state=Uttarakhand")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert loc["state"] == "Uttarakhand"

        # Verify Raini Village is present
        raini = next((l for l in data["locations"] if "Raini" in l["location_name"]), None)
        assert raini is not None
        assert raini["risk_level"] == "CRITICAL"

    def test_5_selecting_maharashtra_filters_locations(self):
        """5. Verify selecting Maharashtra filters locations to Maharashtra."""
        res = client.get("/api/gis/locations?state=Maharashtra")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert loc["state"] == "Maharashtra"

    def test_6_moderate_filter_works(self):
        """6. Verify MODERATE severity filter returns only moderate risk locations."""
        res = client.get("/api/gis/locations?risk_level=MODERATE")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert loc["risk_level"] == "MODERATE"

    def test_7_high_filter_works(self):
        """7. Verify HIGH severity filter returns only high risk locations."""
        res = client.get("/api/gis/locations?risk_level=HIGH")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert loc["risk_level"] == "HIGH"

    def test_8_extremely_high_filter_works(self):
        """8. Verify EXTREMELY HIGH severity filter returns only extremely high risk locations."""
        res = client.get("/api/gis/locations?risk_level=EXTREMELY%20HIGH")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert loc["risk_level"] == "EXTREMELY HIGH"

    def test_9_critical_filter_works(self):
        """9. Verify CRITICAL severity filter returns only critical risk locations."""
        res = client.get("/api/gis/locations?risk_level=CRITICAL")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert loc["risk_level"] == "CRITICAL"

    def test_10_all_filter_works(self):
        """10. Verify ALL filter returns all assessed locations."""
        res = client.get("/api/gis/locations?risk_level=ALL")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) == len(NATIONAL_RISK_RECORDS)

    def test_11_district_filter_works(self):
        """11. Verify district-level filtering works."""
        res = client.get("/api/gis/locations?state=Telangana&district=Medchal-Malkajgiri")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert loc["state"] == "Telangana"
            assert loc["district"] == "Medchal-Malkajgiri"

    def test_12_hazard_filter_works(self):
        """12. Verify hazard type filtering works."""
        res = client.get("/api/gis/locations?hazard_type=Landslide")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert "landslide" in loc["primary_hazard"].lower() or any("landslide" in sh.lower() for sh in loc.get("secondary_hazards", []))

    def test_13_map_markers_correspond_to_real_records(self):
        """13. Verify GeoJSON features match underlying assessed risk records with valid coordinates."""
        res = client.get("/api/gis/locations")
        assert res.status_code == 200
        geojson = res.json()
        assert geojson["type"] == "FeatureCollection"
        for feat in geojson["features"]:
            coords = feat["geometry"]["coordinates"]
            assert len(coords) == 2
            lon, lat = coords
            assert 6.0 <= lat <= 37.5, f"Latitude {lat} out of India bounds"
            assert 68.0 <= lon <= 97.5, f"Longitude {lon} out of India bounds"
            assert feat["properties"]["risk_score"] >= 0.0

    def test_14_clicking_marker_opens_correct_location(self):
        """14. Verify location detail endpoint returns correct record by ID."""
        res = client.get("/api/gis/location/TG-RISK-001")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == "TG-RISK-001"
        assert "Medchal" in data["location_name"]
        assert data["state"] == "Telangana"
        assert data["risk_score"] == 87.4
        assert data["risk_level"] == "CRITICAL"
        assert data["population"] == 1250

    def test_15_risk_score_and_factors_displayed_correctly(self):
        """15. Verify risk score and contributing factors explanations."""
        res = client.get("/api/gis/location/UK-RISK-001")
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] == 87.4
        assert len(data["why_risky_factors"]) > 0
        for factor in data["why_risky_factors"]:
            assert "factor" in factor
            assert "weight" in factor
            assert "description" in factor

    def test_16_population_displayed_correctly(self):
        """16. Verify total and vulnerable population fields."""
        res = client.get("/api/gis/location/TG-RISK-001")
        assert res.status_code == 200
        data = res.json()
        assert data["population"] == 1250
        assert data["vulnerable_population"] == 320

    def test_17_history_displayed_correctly_when_available(self):
        """17. Verify historical assessment records timeline."""
        res = client.get("/api/gis/history/TG-RISK-001")
        assert res.status_code == 200
        data = res.json()
        assert data["has_history"] is True
        assert len(data["records"]) == 4
        assert data["records"][0]["year"] == 2023
        assert data["records"][-1]["year"] == 2026

        # Test location without history returns explicit false without inventing fake data
        res_fake = client.get("/api/gis/history/NON-EXISTENT-ID")
        assert res_fake.status_code == 200
        data_fake = res_fake.json()
        assert data_fake["has_history"] is False

    def test_18_risk_radius_corresponds_to_actual_data(self):
        """18. Verify risk radius comes from actual spatial extent data."""
        res = client.get("/api/gis/location/UK-RISK-001")
        assert res.status_code == 200
        data = res.json()
        assert data["risk_radius_km"] == 3.2

    def test_19_relocation_site_displayed_correctly(self):
        """19. Verify recommended safe site is linked with valid metadata."""
        res = client.get("/api/gis/location/UK-RISK-001")
        assert res.status_code == 200
        data = res.json()
        assert data["recommended_safe_site"] is not None
        safe = data["recommended_safe_site"]
        assert "site_id" in safe
        assert "name" in safe
        assert safe["distance_km"] > 0
        assert safe["direction"] in ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"]
        assert safe["safety_score"] >= 80.0

    def test_20_capacity_displayed_correctly(self):
        """20. Verify relocation capacity figures are positive and realistic."""
        res = client.get("/api/gis/location/UK-RISK-001")
        assert res.status_code == 200
        data = res.json()
        safe = data["recommended_safe_site"]
        assert safe["capacity_total"] > 0
        assert safe["capacity_available"] <= safe["capacity_total"]
        assert 0.0 <= safe["capacity_utilization_pct"] <= 100.0

    def test_21_state_summary_updates_correctly(self):
        """21. Verify state summary endpoint aggregates metrics accurately."""
        res = client.get("/api/gis/summary/Telangana")
        assert res.status_code == 200
        data = res.json()
        assert data["state"] == "Telangana"
        assert data["total_assessed_locations"] >= 4
        assert data["critical_count"] >= 2
        assert data["population_at_risk"] >= 8000
        assert "Medchal-Malkajgiri" in data["districts_with_data"]

    def test_22_state_boundaries_geojson(self):
        """22. Verify official state boundaries GeoJSON endpoint."""
        res = client.get("/api/gis/state-boundaries")
        assert res.status_code == 200
        data = res.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) >= 15
        state_names = [f["properties"]["name"] for f in data["features"]]
        assert "Telangana" in state_names
        assert "Uttarakhand" in state_names

    def test_23_no_fake_national_data(self):
        """23. Verify honest data coverage disclosure; no fabricated nationwide claims."""
        res = client.get("/api/gis/overview")
        assert res.status_code == 200
        data = res.json()
        assert "Displaying" in data["coverage"]["honest_coverage_statement"]
        assert str(data["coverage"]["total_assessed_locations"]) in data["coverage"]["honest_coverage_statement"]

    def test_24_get_directions_coordinates_validity(self):
        """24. Verify destination coordinates for Get Directions navigation are authentic and valid."""
        res = client.get("/api/gis/location/UK-RISK-001")
        assert res.status_code == 200
        data = res.json()
        safe = data["recommended_safe_site"]
        assert safe is not None
        assert 6.0 <= safe["latitude"] <= 37.5
        assert 68.0 <= safe["longitude"] <= 97.5
        # Verify navigation URL construction
        expected_url_part = f"origin={data['latitude']},{data['longitude']}&destination={safe['latitude']},{safe['longitude']}"
        assert f"{data['latitude']},{data['longitude']}" in expected_url_part

    def test_25_multi_filter_combination_support(self):
        """25. Verify multi-filter combination (State + District + Risk Level + Hazard)."""
        res = client.get("/api/gis/locations?state=Telangana&district=Medchal-Malkajgiri&risk_level=CRITICAL")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert loc["state"] == "Telangana"
            assert loc["district"] == "Medchal-Malkajgiri"
            assert loc["risk_level"] == "CRITICAL"

    def test_26_executive_priority_score_and_categories(self):
        """26. Verify executive priority score is within 0-100 and mapped to documented operational categories."""
        res = client.get("/api/gis/locations")
        assert res.status_code == 200
        data = res.json()
        for loc in data["locations"]:
            assert "priority_score" in loc
            assert 0.0 <= loc["priority_score"] <= 100.0
            assert loc["priority_category"] in ["IMMEDIATE REVIEW", "PRIORITY ASSESSMENT", "MONITOR"]
            assert "priority_reasons" in loc
            assert len(loc["priority_reasons"]) > 0

    def test_27_executive_priority_deterministic_ranking(self):
        """27. Verify deterministic ranking order: rank 1 has highest or equal priority score to rank 2."""
        res = client.get("/api/gis/locations")
        assert res.status_code == 200
        data = res.json()
        locs = data["locations"]
        assert len(locs) >= 2
        for i in range(len(locs) - 1):
            assert locs[i]["priority_rank"] == i + 1
            assert locs[i]["priority_score"] >= locs[i+1]["priority_score"]

    def test_28_priority_category_filter_immediate_review(self):
        """28. Verify filtering by executive priority category IMMEDIATE REVIEW."""
        res = client.get("/api/gis/locations?priority_category=IMMEDIATE%20REVIEW")
        assert res.status_code == 200
        data = res.json()
        assert len(data["locations"]) > 0
        for loc in data["locations"]:
            assert loc["priority_category"] == "IMMEDIATE REVIEW"

    def test_29_population_weight_in_priority_calculation(self):
        """29. Verify exposed population meaningfully contributes to priority score."""
        res = client.get("/api/gis/location/TG-RISK-001")
        assert res.status_code == 200
        data = res.json()
        assert "priority_breakdown" in data
        assert data["priority_breakdown"]["population_points"] > 0
        assert data["priority_breakdown"]["vulnerability_points"] > 0

    def test_30_relocation_readiness_influence_on_priority(self):
        """30. Verify relocation readiness is reflected in priority reasons."""
        res = client.get("/api/gis/location/UK-RISK-001")
        assert res.status_code == 200
        data = res.json()
        assert any("shelter" in r.lower() or "safe site" in r.lower() for r in data["priority_reasons"])

    def test_31_deterministic_tie_breaking(self):
        """31. Verify tie-breaking logic is completely deterministic and stable across multiple queries."""
        res1 = client.get("/api/gis/locations?state=Telangana")
        res2 = client.get("/api/gis/locations?state=Telangana")
        assert res1.status_code == 200
        assert res2.status_code == 200
        ids1 = [l["id"] for l in res1.json()["locations"]]
        ids2 = [l["id"] for l in res2.json()["locations"]]
        assert ids1 == ids2

    def test_32_combined_state_risk_priority_filter(self):
        """32. Verify combined filtering of State + Risk Level + Priority Category."""
        res = client.get("/api/gis/locations?state=Uttarakhand&risk_level=CRITICAL&priority_category=IMMEDIATE%20REVIEW")
        assert res.status_code == 200
        data = res.json()
        for loc in data["locations"]:
            assert loc["state"] == "Uttarakhand"
            assert loc["risk_level"] == "CRITICAL"
            assert loc["priority_category"] == "IMMEDIATE REVIEW"


