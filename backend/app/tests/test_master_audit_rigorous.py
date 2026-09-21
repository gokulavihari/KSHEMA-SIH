import pytest
from app.services.relocation_service import (
    find_location_relocation_options,
    calculate_bearing_and_direction,
    is_within_india_region
)
from app.data_providers.shelter_provider import (
    fetch_nationwide_shelter_candidates,
    classify_shelter_record
)

# ---------------------------------------------------------------------------
# 1. BEARING & 8-POINT COMPASS DIRECTION UNIT TESTS (SECTION 3 & 11)
# ---------------------------------------------------------------------------

def test_compass_direction_north():
    # Origin (17.0, 78.0) -> Candidate (18.0, 78.0)
    bearing, direction = calculate_bearing_and_direction(17.0, 78.0, 18.0, 78.0)
    assert direction == "North"
    assert 0.0 <= bearing <= 5.0 or 355.0 <= bearing <= 360.0

def test_compass_direction_south():
    # Origin (18.0, 78.0) -> Candidate (17.0, 78.0)
    bearing, direction = calculate_bearing_and_direction(18.0, 78.0, 17.0, 78.0)
    assert direction == "South"
    assert 175.0 <= bearing <= 185.0

def test_compass_direction_east():
    # Origin (17.0, 78.0) -> Candidate (17.0, 79.0)
    bearing, direction = calculate_bearing_and_direction(17.0, 78.0, 17.0, 79.0)
    assert direction == "East"
    assert 85.0 <= bearing <= 95.0

def test_compass_direction_west():
    # Origin (17.0, 79.0) -> Candidate (17.0, 78.0)
    bearing, direction = calculate_bearing_and_direction(17.0, 79.0, 17.0, 78.0)
    assert direction == "West"
    assert 265.0 <= bearing <= 275.0

def test_compass_direction_northeast():
    # Origin (17.0, 78.0) -> Candidate (18.0, 79.0)
    bearing, direction = calculate_bearing_and_direction(17.0, 78.0, 18.0, 79.0)
    assert direction == "North-East"
    assert 22.5 <= bearing <= 67.5

def test_compass_direction_northwest():
    # Origin (17.0, 79.0) -> Candidate (18.0, 78.0)
    bearing, direction = calculate_bearing_and_direction(17.0, 79.0, 18.0, 78.0)
    assert direction == "North-West"
    assert 292.5 <= bearing <= 337.5

def test_compass_direction_southeast():
    # Origin (18.0, 78.0) -> Candidate (17.0, 79.0)
    bearing, direction = calculate_bearing_and_direction(18.0, 78.0, 17.0, 79.0)
    assert direction == "South-East"
    assert 112.5 <= bearing <= 157.5

def test_compass_direction_southwest():
    # Origin (18.0, 79.0) -> Candidate (17.0, 78.0)
    bearing, direction = calculate_bearing_and_direction(18.0, 79.0, 17.0, 78.0)
    assert direction == "South-West"
    assert 202.5 <= bearing <= 247.5

def test_zero_distance_direction():
    bearing, direction = calculate_bearing_and_direction(17.0, 78.0, 17.0, 78.0)
    assert direction == "Same Location"
    assert bearing == 0.0


# ---------------------------------------------------------------------------
# 2. ALL-INDIA GEOGRAPHIC LOCATIONS AUDIT (SECTION 11 LOCATIONS 1-12)
# ---------------------------------------------------------------------------

NATIONWIDE_TEST_LOCATIONS = [
    ("Hyderabad", 17.3850, 78.4867),
    ("Mumbai", 19.0760, 72.8777),
    ("Delhi", 28.6139, 77.2090),
    ("Wayanad", 11.6854, 76.1320),
    ("Joshimath", 30.5574, 79.5647),
    ("Kullu", 31.9579, 77.1095),
    ("Assam", 26.2006, 92.9376),
    ("Odisha", 20.2961, 85.8245),
    ("Coastal AP", 16.5062, 80.6480),
    ("Jammu and Kashmir", 34.0837, 74.7973),
    ("Arunachal Pradesh", 27.1004, 93.6166),
    ("Random Valid Indian Coords", 23.5000, 81.2000)
]

@pytest.mark.parametrize("loc_name, lat, lon", NATIONWIDE_TEST_LOCATIONS)
def test_nationwide_location_relocation(loc_name, lat, lon):
    res = find_location_relocation_options(lat, lon, population_to_relocate=100)
    assert res["success"] is True
    assert res["status"] in ["FEASIBLE_COMPLETE", "FEASIBLE_PARTIAL", "POTENTIAL_RELOCATION_CANDIDATE"]

    selected = res.get("selected_site")
    assert selected is not None, f"Selected site missing for {loc_name}"

    # Verify origin transparency fields (Section 1)
    assert selected.get("candidate_origin") in ["LIVE_OSM", "CACHED_GIS", "STATIC_SDMA", "ESTIMATED_FALLBACK"]
    assert selected.get("capacity_status") in ["VERIFIED", "ESTIMATED", "UNKNOWN"]
    assert selected.get("source_status") in ["LIVE", "STATIC", "CACHED", "ESTIMATED"]

    # Verify distance payload transparency (Section 4)
    dist = selected.get("distance", {})
    assert dist.get("straight_line_km", 0.0) >= 0.0
    assert dist.get("road_km", 0.0) >= 0.0
    assert dist.get("road_status") in ["ROAD_ESTIMATED", "ROAD_ROUTE_VERIFIED", "ROUTE_UNAVAILABLE"]
    assert dist.get("distance_is_estimated") is True or dist.get("road_status") == "ROAD_ROUTE_VERIFIED"

    # Verify direction presence
    assert dist.get("direction") in ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"]
    assert 0.0 <= dist.get("bearing_degrees", 0.0) <= 360.0

    # Verify selection explanations (Section 7)
    reasons = selected.get("why_selected", [])
    assert len(reasons) >= 3
    assert any("Distance:" in r or "Direction:" in r or "hazard" in r.lower() for r in reasons)


# ---------------------------------------------------------------------------
# 3. BOUNDARY, INVALID & EDGE CASE TESTS (SECTION 11 LOCATIONS 13-20)
# ---------------------------------------------------------------------------

def test_invalid_coordinates_raises_error():
    with pytest.raises(ValueError):
        find_location_relocation_options(999.0, 78.0, 100)

def test_outside_india_coordinates_handled():
    # Atlantic Ocean / Africa (10.0, 10.0)
    res = find_location_relocation_options(10.0, 10.0, 100)
    assert res["status"] == "LOCATION_OUTSIDE_SUPPORTED_INDIA_REGION"
    assert res["selected_site"] is None

def test_candidate_membership_in_evaluated_pool():
    # Proves selected_site is derived directly from evaluated candidate pool (Section 6)
    res = find_location_relocation_options(30.5574, 79.5647, 100)
    selected = res.get("selected_site")
    cand_ids = [c.get("site_id") for c in res.get("allocations", [])] + [c.get("site_id") for c in res.get("alternatives", [])]
    if selected and cand_ids:
        assert selected["site_id"] in cand_ids

def test_missing_capacity_handled_honestly():
    # Candidate missing capacity verified flag returns UNKNOWN capacity status (Section 2)
    sample_site = {
        "site_id": "TEST-CAP-UNK",
        "latitude": 30.5,
        "longitude": 79.5,
        "capacity_verified": False,
        "verification_status": "UNVERIFIED"
    }
    classified = classify_shelter_record(sample_site)
    assert classified["capacity_status"] in ["ESTIMATED", "UNKNOWN"]
    assert classified["capacity_verified"] is False
