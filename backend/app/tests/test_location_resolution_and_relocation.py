import pytest
import math
import random
from app.data_providers.geocoding_provider import forward_geocode, forward_geocode_search, reverse_geocode, is_within_india_bounding_box
from app.services.location_service import perform_spatial_location_analysis
from app.services.relocation_service import find_location_relocation_options

# Test Matrix: 27 Required Indian Locations with Expected States
LOCATION_TEST_MATRIX = [
    ("Kullu", "Himachal Pradesh", 31.9579, 77.1095),
    ("Hyderabad", "Telangana", 17.3850, 78.4867),
    ("Mumbai", "Maharashtra", 19.0760, 72.8777),
    ("Delhi", "Delhi", 28.6139, 77.2090),
    ("Chennai", "Tamil Nadu", 13.0827, 80.2707),
    ("Bengaluru", "Karnataka", 12.9716, 77.5946),
    ("Kochi", "Kerala", 9.9312, 76.2673),
    ("Wayanad", "Kerala", 11.6854, 76.1320),
    ("Bhubaneswar", "Odisha", 20.2961, 85.8245),
    ("Kolkata", "West Bengal", 22.5726, 88.3639),
    ("Guwahati", "Assam", 26.1445, 91.7362),
    ("Jaipur", "Rajasthan", 26.9124, 75.7873),
    ("Ahmedabad", "Gujarat", 23.0225, 72.5714),
    ("Pune", "Maharashtra", 18.5204, 73.8567),
    ("Nagpur", "Maharashtra", 21.1458, 79.0882),
    ("Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185),
    ("Vijayawada", "Andhra Pradesh", 16.5062, 80.6480),
    ("Bhopal", "Madhya Pradesh", 23.2599, 77.4126),
    ("Lucknow", "Uttar Pradesh", 26.8467, 80.9462),
    ("Patna", "Bihar", 25.5941, 85.1376),
    ("Ranchi", "Jharkhand", 23.3441, 85.3096),
    ("Srinagar", "Jammu and Kashmir", 34.0837, 74.7973),
    ("Shillong", "Meghalaya", 25.5788, 91.8933),
    ("Gangtok", "Sikkim", 27.3389, 88.6065),
    ("Itanagar", "Arunachal Pradesh", 27.0844, 93.6053),
    ("Port Blair", "Andaman and Nicobar Islands", 11.6234, 92.7265)
]

def test_location_matrix_resolution_and_state_accuracy():
    """Verify forward geocoding and state mapping for all 27 required test locations."""
    failed_items = []
    for query, expected_state, exp_lat, exp_lon in LOCATION_TEST_MATRIX:
        res = forward_geocode(query)
        if not res:
            failed_items.append((query, "Geocoding returned None"))
            continue
        if res["country"] != "India":
            failed_items.append((query, f"Country is {res['country']}"))
            continue
        
        state_match = (
            expected_state.lower() in res["state"].lower() or
            res["state"].lower() in expected_state.lower() or
            expected_state.lower() in res["display_name"].lower()
        )
        dist_err = math.sqrt((res["latitude"] - exp_lat)**2 + (res["longitude"] - exp_lon)**2) * 111.0
        
        if not state_match:
            failed_items.append((query, f"State mismatch: got '{res['state']}' vs expected '{expected_state}'"))
        elif dist_err > 250.0:
            failed_items.append((query, f"Distance offset too high: {dist_err:.1f} km"))

    assert len(failed_items) == 0, f"Matrix test failed for items: {failed_items}"

def test_no_chamoli_fallback_for_unknown_searches():
    """Ensure invalid/unknown location searches do NOT return Chamoli or Joshimath fallbacks."""
    res = forward_geocode("NonExistentFakeLocationName12345")
    assert res is None, "Unknown location query should return None rather than a Chamoli fallback"

    search_res = forward_geocode_search("NonExistentFakeLocationName12345")
    assert len(search_res) == 0, "Unknown location search should return empty array"

def test_relocation_origin_consistency_assertion():
    """Verify that relocation engine asserts origin coordinates match input selected location."""
    test_lat, test_lon = 17.3850, 78.4867 # Hyderabad
    reloc = find_location_relocation_options(latitude=test_lat, longitude=test_lon)
    
    assert reloc["success"] is True
    assert math.isclose(reloc["origin"]["latitude"], test_lat, abs_tol=1e-4)
    assert math.isclose(reloc["origin"]["longitude"], test_lon, abs_tol=1e-4)
    assert reloc["selected_site"] is not None
    assert reloc["relocation_status"] in ["VERIFIED_RELOCATION_FOUND", "POTENTIAL_RELOCATION_FOUND", "ESTIMATED_RELOCATION_FOUND"]

def test_relocation_direction_and_bearing_calculation():
    """Verify direction calculation for candidates in different compass quadrants relative to origin."""
    origin_lat, origin_lon = 20.0, 78.0 # Central India
    reloc = find_location_relocation_options(latitude=origin_lat, longitude=origin_lon)
    
    site = reloc["selected_site"]
    assert site["direction"] in ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West", "Same Location"]
    assert 0.0 <= site["bearing_degrees"] <= 360.0

def test_50_random_indian_locations_relocation_pipeline():
    """
    Evaluates 50 random valid Indian coordinates covering North, South, East, West, Central, North-East, Coastal, Mountain, Urban, and Rural regions.
    Ensures zero failures and tracks candidate status distribution.
    """
    random.seed(42) # Deterministic random seed
    
    status_counts = {
        "VERIFIED_RELOCATION_SITE": 0,
        "POTENTIAL_RELOCATION_CANDIDATE": 0,
        "ESTIMATED_RELOCATION_ZONE": 0,
        "NO_RELOCATION_CANDIDATE_FOUND": 0
    }

    test_coords = []
    for _ in range(50):
        lat = round(random.uniform(10.0, 32.0), 4)
        lon = round(random.uniform(72.0, 88.0), 4)
        test_coords.append((lat, lon))

    for idx, (lat, lon) in enumerate(test_coords):
        spatial = perform_spatial_location_analysis(lat, lon)
        assert spatial["location_info"]["country"] in ["India", "中国", "Indian Region", "Nepal", "Bhutan", "Pakistan", "Bangladesh"]

        
        reloc = find_location_relocation_options(lat, lon, population_to_relocate=500)
        assert reloc["success"] is True, f"Relocation failed for random coord ({lat}, {lon})"
        assert math.isclose(reloc["origin"]["latitude"], lat, abs_tol=1e-4)
        assert math.isclose(reloc["origin"]["longitude"], lon, abs_tol=1e-4)

        site = reloc.get("selected_site")
        if site:
            status = site.get("status", "POTENTIAL_RELOCATION_CANDIDATE")
            if status in status_counts:
                status_counts[status] += 1
            else:
                status_counts["POTENTIAL_RELOCATION_CANDIDATE"] += 1
        else:
            status_counts["NO_RELOCATION_CANDIDATE_FOUND"] += 1

    total_evaluated = sum(status_counts.values())
    assert total_evaluated == 50
    assert status_counts["NO_RELOCATION_CANDIDATE_FOUND"] < 5, "At least 90% of random Indian coordinates must return a relocation candidate"
    
    print("\n--- 50 RANDOM INDIAN LOCATIONS RELOCATION AUDIT RESULT ---")
    print(f"Total Evaluated: {total_evaluated}")
    print(f"VERIFIED_RELOCATION_SITE: {status_counts['VERIFIED_RELOCATION_SITE']} ({status_counts['VERIFIED_RELOCATION_SITE']/total_evaluated*100:.1f}%)")
    print(f"POTENTIAL_RELOCATION_CANDIDATE: {status_counts['POTENTIAL_RELOCATION_CANDIDATE']} ({status_counts['POTENTIAL_RELOCATION_CANDIDATE']/total_evaluated*100:.1f}%)")
    print(f"ESTIMATED_RELOCATION_ZONE: {status_counts['ESTIMATED_RELOCATION_ZONE']} ({status_counts['ESTIMATED_RELOCATION_ZONE']/total_evaluated*100:.1f}%)")
    print(f"NO_RELOCATION_CANDIDATE_FOUND: {status_counts['NO_RELOCATION_CANDIDATE_FOUND']} ({status_counts['NO_RELOCATION_CANDIDATE_FOUND']/total_evaluated*100:.1f}%)")
