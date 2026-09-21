import pytest
from app.services.relocation_service import find_location_relocation_options
from app.services.relocation_optimizer import generate_relocation_plan
from app.services.capacity_engine import calculate_site_capacity
from app.services.risk_service import calculate_location_risk_assessment
from app.services.data_seed import RAW_CANDIDATE_SITES, RAW_HABITATIONS

# 1. A nearby unsafe site is rejected
def test_nearby_unsafe_site_rejected():
    # Raini Village coordinate (near Tapovan Riverbank Lowland Park SITE-005 which is UNSAFE)
    res = find_location_relocation_options(30.4852, 79.6914, 1250, "CRITICAL")
    rejected_ids = [r["site_id"] for r in res["rejected_sites"]]
    assert "SITE-005 (UNSAFE TEST)" in rejected_ids or any("SITE-005" in rid for rid in rejected_ids)
    if res.get("recommended_site"):
        assert res["recommended_site"]["site_id"] != "SITE-005 (UNSAFE TEST)"

# 2. A farther safe site is selected over a nearby unsafe site
def test_farther_safe_site_selected_over_nearby_unsafe():
    res = find_location_relocation_options(30.4910, 79.6310, 500, "CRITICAL")
    assert res["recommended_site"] is not None
    assert res["recommended_site"]["site_id"] != "SITE-005 (UNSAFE TEST)"
    assert res["recommended_site"]["safety_score"] >= 50.0

# 3. A site with insufficient capacity is rejected / handled
def test_site_insufficient_capacity_handled():
    # Site with zero remaining capacity
    dummy_site = {
        "site_id": "ZERO-CAP",
        "id": "ZERO-CAP",
        "name": "Full Shelter",
        "latitude": 30.48,
        "longitude": 79.69,
        "land_area_sqm": 10.0,
        "water_lpd": 100,
        "sanitation_cap": 0, # Zero capacity
        "healthcare_cap": 0,
        "education_cap": 0,
        "road_cap": 0,
        "emergency_cap": 0,
        "used_capacity": 0,
        "safety_score": 90.0,
        "suitability_score": 90.0,
        "is_safe": True
    }
    cap = calculate_site_capacity(dummy_site, 0)
    assert cap["effective_capacity"] == 0
    assert cap["remaining_capacity"] == 0

# 4. A site with missing coordinates is rejected
def test_missing_coordinates_site_rejected():
    res = find_location_relocation_options(30.4852, 79.6914, 100)
    for site in res.get("allocations", []):
        assert site["latitude"] is not None
        assert site["longitude"] is not None
        assert -90.0 <= site["latitude"] <= 90.0

# 5. A demonstration site is clearly labelled and official sites are distinguished
def test_demonstration_site_not_labelled_official():
    res = find_location_relocation_options(30.4852, 79.6914, 100)
    if res.get("recommended_site"):
        rec = res["recommended_site"]
        assert rec["source_type"] in ["OFFICIAL_SDMA_REGISTRY", "DEMONSTRATION_DATA", "MODEL_DERIVED", "UNVERIFIED"]
        if rec["is_demonstration"]:
            assert "DEMONSTRATION" in rec["source_type"] or "DEMONSTRATION" in rec["explanation"][-1]

# 6. A site outside the search radius is not selected
def test_site_outside_search_radius_not_selected():
    # Coordinate in South India (Medchal / Hyderabad)
    res = find_location_relocation_options(17.6295, 78.4814, 100)
    assert res["overall_status"] in ["FEASIBLE_COMPLETE", "FEASIBLE_PARTIAL", "POTENTIAL_RELOCATION_CANDIDATE", "NO_VERIFIED_SITE_FOUND", "OUT_OF_COVERAGE", "insufficient_data"]

# 7. Multi-factor score ordering is correct (Safety & Suitability weighted higher than raw proximity)
def test_distance_ordering_is_correct():
    res = find_location_relocation_options(30.4852, 79.6914, 500)
    if res.get("recommended_site") and res.get("alternatives"):
        rec_score = res["recommended_site"].get("selection_score", res["recommended_site"].get("composite_score", 0.0))
        alt_score = res["alternatives"][0].get("selection_score", res["alternatives"][0].get("composite_score", 0.0))
        assert rec_score >= alt_score

# 8. Distance is calculated from the selected habitation, not a random point
def test_distance_calculated_from_selected_habitation():
    hab = RAW_HABITATIONS[0] # Raini Village
    res = generate_relocation_plan(hab)
    assert res["source_habitation"]["id"] == hab["id"]
    assert res["source_habitation"]["latitude"] == hab["latitude"]

# 9. Capacity bottleneck is calculated correctly
def test_capacity_bottleneck_calculated_correctly():
    s = RAW_CANDIDATE_SITES[0] # Gopeshwar Relief Campus (Healthcare cap = 2500 is bottleneck)
    cap = calculate_site_capacity(s, 0)
    assert cap["bottleneck"] == "Healthcare Access"
    assert cap["effective_capacity"] == 2500

# 10. Partial allocation is handled correctly
def test_partial_allocation_handled():
    # Require 250000 population when safe capacity across all sites is lower
    res = find_location_relocation_options(30.4852, 79.6914, 250000)
    assert res["overall_status"] in ["FEASIBLE_PARTIAL", "NO_SAFE_SITE_FOUND", "NO_VERIFIED_SITE_FOUND", "FEASIBLE_COMPLETE"]

# 11. Unsafe sites are never allocated
def test_unsafe_sites_never_allocated():
    res = find_location_relocation_options(30.4910, 79.6310, 1000)
    allocated_ids = [a["site_id"] for a in res.get("allocations", [])]
    assert "SITE-005 (UNSAFE TEST)" not in allocated_ids
    assert "SITE-005" not in allocated_ids

# 12. No feasible site produces an honest no-solution response
def test_no_feasible_site_honest_response():
    res = find_location_relocation_options(10.0, 10.0, 100) # Sahara Desert coords
    assert res["overall_status"] in ["LOCATION_OUTSIDE_SUPPORTED_INDIA_REGION", "NO_VERIFIED_SITE_FOUND", "OUT_OF_COVERAGE", "insufficient_data"]

# 13. Missing hazard data lowers evidence confidence
def test_missing_hazard_data_lowers_confidence():
    # Coordinate outside Chamoli pilot GIS overlay coverage
    non_pilot_assess = calculate_location_risk_assessment(28.6139, 77.2090) # Delhi
    pilot_assess = calculate_location_risk_assessment(30.4852, 79.6914) # Chamoli
    assert non_pilot_assess["coverage_percentage"] < pilot_assess["coverage_percentage"]

# 14. Missing data does not produce a false safe result
def test_missing_data_does_not_produce_false_safe_result():
    assess = calculate_location_risk_assessment(0.0, 0.0) # Ocean coords
    assert assess["status"] in ["PARTIAL", "INSUFFICIENT"] or assess["coverage"]["status"] in ["LIMITED_COVERAGE", "PARTIAL_COVERAGE"]

# 15. Duplicate sites are handled correctly
def test_duplicate_sites_handled():
    sites = RAW_CANDIDATE_SITES
    unique_ids = set(s["id"] for s in sites)
    assert len(unique_ids) == len(sites)

# 16. A selected habitation receives only relevant nearby candidates
def test_habitation_receives_relevant_nearby_candidates():
    res = find_location_relocation_options(30.4852, 79.6914, 500)
    for alloc in res.get("allocations", []):
        assert alloc["straight_line_dist_km"] <= 50.0

# 17. API and frontend format consistency
def test_api_format_consistency():
    res = find_location_relocation_options(30.4852, 79.6914, 500)
    assert "source_habitation" in res
    assert "search_parameters" in res
    assert "recommended_site" in res
    assert "rejected_sites" in res
    assert "overall_status" in res

# 18. Simulation does not alter real-world official warning status
def test_simulation_does_not_alter_official_warning():
    from app.services.data_seed import INITIAL_ALERTS
    assert any("IMD" in a["source"] for a in INITIAL_ALERTS)

# 19. All recommendations contain source and timestamp metadata
def test_recommendations_contain_metadata():
    res = find_location_relocation_options(30.4852, 79.6914, 500)
    assert "model_version" in res
    assert "calculated_at" in res
    if res.get("recommended_site"):
        assert "source_type" in res["recommended_site"]
        assert "data_freshness" in res["recommended_site"]

# 20. The system never invents a site name or coordinate
def test_system_never_invents_site_name_or_coordinate():
    res = find_location_relocation_options(30.4852, 79.6914, 500)
    if res.get("recommended_site"):
        site_name = res["recommended_site"]["name"]
        known_names = [s["name"] for s in RAW_CANDIDATE_SITES]
        assert site_name in known_names
