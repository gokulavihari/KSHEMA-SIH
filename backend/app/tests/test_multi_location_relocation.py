import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.relocation_service import find_location_relocation_options
from app.services.data_seed import RAW_HABITATIONS, RAW_CANDIDATE_SITES

client = TestClient(app)

# 10+ Test Habitations across Chamoli, Joshimath, Tharali, Dewal, Gauchar, Rishikesh, Telangana
TEST_LOCATIONS = [
    {
        "id": "HAB-001",
        "name": "Raini Village (Reni)",
        "latitude": 30.4852,
        "longitude": 79.6914,
        "population": 1250,
        "expected_site": "SITE-007" # Tapovan Upper Ridge or Joshimath Army Hub
    },
    {
        "id": "HAB-002",
        "name": "Joshimath Upper Ward",
        "latitude": 30.5564,
        "longitude": 79.5642,
        "population": 2000,
        "expected_site": "SITE-006" # Joshimath Army Staging Hub
    },
    {
        "id": "HAB-003",
        "name": "Tapovan Valley Settlement",
        "latitude": 30.4935,
        "longitude": 79.6295,
        "population": 1000,
        "expected_site": "SITE-007" # Tapovan Upper Ridge
    },
    {
        "id": "HAB-004",
        "name": "Helang Slope Habitation",
        "latitude": 30.5180,
        "longitude": 79.4890,
        "population": 920,
        "expected_site": "SITE-002" # Pipalkoti (Closest to Helang)
    },
    {
        "id": "HAB-005",
        "name": "Pandukeshwar Village",
        "latitude": 30.6340,
        "longitude": 79.5490,
        "population": 1600,
        "expected_site": "SITE-006" # Joshimath Army Hub
    },
    {
        "id": "HAB-006",
        "name": "Mana Village (Border Settlement)",
        "latitude": 30.7760,
        "longitude": 79.4960,
        "population": 780,
        "expected_site": "SITE-011" # Badrinath Transit Shelter
    },
    {
        "id": "HAB-007",
        "name": "Pipalkoti Valley Ward",
        "latitude": 30.4320,
        "longitude": 79.4310,
        "population": 1500,
        "expected_site": "SITE-002" # Pipalkoti Polytechnic
    },
    {
        "id": "HAB-008",
        "name": "Chamoli Old Town",
        "latitude": 30.4040,
        "longitude": 79.3360,
        "population": 2000,
        "expected_site": "SITE-001" # Gopeshwar District Relief Campus
    },
    {
        "id": "HAB-009",
        "name": "Tharali Slope Village",
        "latitude": 30.0650,
        "longitude": 79.5020,
        "population": 1500,
        "expected_site": "SITE-008" # Tharali Sub-Divisional Ground
    },
    {
        "id": "HAB-010",
        "name": "Dewal High Village",
        "latitude": 30.0210,
        "longitude": 79.6100,
        "population": 1150,
        "expected_site": "SITE-009" # Dewal Block High School
    }
]

class TestMultiLocationRelocationEngine:

    def test_location_specific_recommendation_changes(self):
        """
        Verify that changing input habitation coordinates changes the recommended site.
        Recommendations must NOT collapse to SITE-002 for all habitations!
        """
        recommended_sites = []
        for loc in TEST_LOCATIONS:
            res = find_location_relocation_options(
                latitude=loc["latitude"],
                longitude=loc["longitude"],
                population_to_relocate=loc["population"],
                habitation_id=loc["id"],
                habitation_name=loc["name"]
            )
            assert res["status"] in ["SUCCESS", "FEASIBLE_COMPLETE"], f"Failed for {loc['name']}"
            assert res["recommended_site"] is not None, f"No recommended site for {loc['name']}"
            rec_id = res["recommended_site"]["site_id"]
            recommended_sites.append(rec_id)

        unique_recommended = set(recommended_sites)
        assert len(unique_recommended) >= 4, (
            f"Relocation recommendations collapsed into too few distinct sites across 10 locations: {recommended_sites}"
        )
        # Ensure SITE-002 is not the recommendation for all habitations
        count_site2 = recommended_sites.count("SITE-002")
        assert count_site2 < len(TEST_LOCATIONS) // 2, f"SITE-002 recommended too frequently: {recommended_sites}"

    def test_distance_recalculation_per_location(self):
        """Verify candidate distances change dynamically per habitation location."""
        res_joshimath = find_location_relocation_options(30.5564, 79.5642, 1000) # Joshimath
        res_tharali = find_location_relocation_options(30.0650, 79.5020, 1000)   # Tharali

        dist_josh_army = res_joshimath["recommended_site"]["distance_km"]
        dist_tharali_rec = res_tharali["recommended_site"]["distance_km"]

        assert res_joshimath["recommended_site"]["site_id"] != res_tharali["recommended_site"]["site_id"]
        assert dist_josh_army < 10.0 # Joshimath Army Hub is within 10km of Joshimath
        assert dist_tharali_rec < 10.0 # Tharali Ground is within 10km of Tharali

    def test_unsafe_sites_rejected_all_locations(self):
        """Verify unsafe sites (SITE-005, SITE-012) are rejected for all locations."""
        for loc in TEST_LOCATIONS:
            res = find_location_relocation_options(loc["latitude"], loc["longitude"], 500)
            if res.get("recommended_site"):
                rec_id = res["recommended_site"]["site_id"]
                assert rec_id not in ["SITE-005", "SITE-012"]
            
            rejected_ids = [r["site_id"] for r in res.get("rejected_sites", [])]
            assert "SITE-005" in rejected_ids or "SITE-012" in rejected_ids

    def test_zero_capacity_site_rejection(self):
        """Verify site with zero capacity is rejected."""
        zero_cap_site = {
            "site_id": "TEST-ZERO-CAP",
            "id": "TEST-ZERO-CAP",
            "name": "Zero Cap Shelter",
            "latitude": 30.4852,
            "longitude": 79.6914,
            "land_area_sqm": 0.0,
            "water_lpd": 0,
            "sanitation_cap": 0,
            "healthcare_cap": 0,
            "education_cap": 0,
            "road_cap": 0,
            "emergency_cap": 0,
            "used_capacity": 0,
            "is_safe": True,
            "safety_score": 90.0,
            "suitability_score": 90.0
        }
        res = find_location_relocation_options(30.4852, 79.6914, 500, candidate_sites=[zero_cap_site])
        assert res["status"] == "NO_VERIFIED_SITE_FOUND"
        assert res["recommended_site"] is None
        assert any("Zero Remaining Capacity" in r["reason"] for r in res["rejected_sites"])

    def test_out_of_coverage_returns_no_site_found(self):
        """Verify distant coordinates (Medchal / Hyderabad) return NO_VERIFIED_SITE_FOUND."""
        res = find_location_relocation_options(17.6041, 78.4838, 500)
        assert res["status"] == "NO_VERIFIED_SITE_FOUND"
        assert res["recommended_site"] is None

    def test_radius_expansion_hierarchy(self):
        """Verify radius expansion hierarchy (10km -> 25km -> 50km)."""
        # Tharali: Tharali Ground is within 10km
        res_10 = find_location_relocation_options(30.0650, 79.5020, 500)
        assert res_10["search_parameters"]["search_radius_used_km"] == 10.0

        # Location ~20km from nearest safe site (Helang to Gopeshwar)
        res_25 = find_location_relocation_options(30.5180, 79.4890, 500)
        assert res_25["search_parameters"]["search_radius_used_km"] in [10.0, 25.0]

    def test_multiple_eligible_alternatives_returned(self):
        """Verify API returns top alternatives when multiple eligible sites exist."""
        res = find_location_relocation_options(30.4180, 79.3240, 500) # Gopeshwar
        assert res["recommended_site"] is not None
        assert len(res["alternatives"]) >= 1

    def test_debug_summary_endpoint(self):
        """Verify GET /api/debug/relocation-sites-summary diagnostic endpoint."""
        response = client.get("/api/debug/relocation-sites-summary")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "all_sites_inventory" in data
        assert "rejected_sites_audit" in data
        summary = data["summary"]
        assert summary["total_site_count"] == len(RAW_CANDIDATE_SITES)
        assert summary["safe_sites_count"] > 0
        assert summary["unsafe_sites_count"] >= 2 # SITE-005 & SITE-012

    def test_database_readiness_endpoint(self):
        """Verify GET /api/debug/database-readiness diagnostic endpoint."""
        response = client.get("/api/debug/database-readiness")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "READY_FOR_SIH_JURY_DEMO"
        assert "metrics" in data
        metrics = data["metrics"]
        assert metrics["total_habitations"] == len(RAW_HABITATIONS)
        assert metrics["total_relocation_sites"] == len(RAW_CANDIDATE_SITES)
        assert metrics["sites_with_valid_coordinates"] == len(RAW_CANDIDATE_SITES)
        assert metrics["sites_marked_safe"] > 0
        assert metrics["sites_marked_unsafe"] >= 2
        assert "geographic_coverage_disclaimer" in data

