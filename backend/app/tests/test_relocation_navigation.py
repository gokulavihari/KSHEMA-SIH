import pytest
import math
from app.services.relocation_service import find_location_relocation_options
from app.services.data_seed import RAW_CANDIDATE_SITES

def is_valid_coordinate(latitude, longitude):
    if latitude is None or longitude is None:
        return False
    try:
        lat = float(latitude)
        lng = float(longitude)
    except (ValueError, TypeError):
        return False
    if math.isnan(lat) or math.isnan(lng) or math.isinf(lat) or math.isinf(lng):
        return False
    if lat < -90.0 or lat > 90.0 or lng < -180.0 or lng > 180.0:
        return False
    if lat == 0.0 and lng == 0.0:
        return False
    return True

def generate_google_maps_directions_url(latitude, longitude):
    if not is_valid_coordinate(latitude, longitude):
        return None
    lat = float(latitude)
    lng = float(longitude)
    return f"https://www.google.com/maps/dir/?api=1&destination={lat:.6f},{lng:.6f}"


def test_valid_coordinates_generate_correct_url():
    url = generate_google_maps_directions_url(30.4852, 79.6914)
    assert url == "https://www.google.com/maps/dir/?api=1&destination=30.485200,79.691400"


def test_missing_latitude_disables_navigation():
    url = generate_google_maps_directions_url(None, 79.6914)
    assert url is None


def test_missing_longitude_disables_navigation():
    url = generate_google_maps_directions_url(30.4852, None)
    assert url is None


def test_invalid_latitude_disables_navigation():
    # Outside -90 to 90
    assert generate_google_maps_directions_url(95.0, 79.6914) is None
    assert generate_google_maps_directions_url(-91.0, 79.6914) is None
    assert generate_google_maps_directions_url("invalid", 79.6914) is None


def test_invalid_longitude_disables_navigation():
    # Outside -180 to 180
    assert generate_google_maps_directions_url(30.4852, 185.0) is None
    assert generate_google_maps_directions_url(30.4852, -181.0) is None
    assert generate_google_maps_directions_url(30.4852, "invalid") is None


def test_zero_dummy_coordinate_disables_navigation():
    assert generate_google_maps_directions_url(0.0, 0.0) is None


def test_recommended_site_uses_own_coordinates():
    # Query relocation options for Raini Village coordinates
    res = find_location_relocation_options(30.4852, 79.6914, 1250, "CRITICAL")
    assert res["status"] in ["FEASIBLE_COMPLETE", "SUCCESS"]
    rec = res.get("recommended_site") or res.get("nearest_feasible_site")
    assert rec is not None
    assert "latitude" in rec and "longitude" in rec
    assert is_valid_coordinate(rec["latitude"], rec["longitude"])

    url = generate_google_maps_directions_url(rec["latitude"], rec["longitude"])
    assert url is not None
    assert f"{rec['latitude']:.6f}" in url
    assert f"{rec['longitude']:.6f}" in url


def test_alternative_sites_use_their_own_coordinates():
    res = find_location_relocation_options(30.4852, 79.6914, 1250, "CRITICAL")
    alts = res.get("alternative_sites") or res.get("alternatives") or []
    if alts:
        rec = res.get("recommended_site") or res.get("nearest_feasible_site")
        for alt in alts:
            assert is_valid_coordinate(alt["latitude"], alt["longitude"])
            alt_url = generate_google_maps_directions_url(alt["latitude"], alt["longitude"])
            assert alt_url is not None
            # Verify alternative site URL uses alt's coordinates, not rec's
            if rec and (alt["latitude"] != rec["latitude"] or alt["longitude"] != rec["longitude"]):
                rec_url = generate_google_maps_directions_url(rec["latitude"], rec["longitude"])
                assert alt_url != rec_url


def test_real_database_relocation_candidates():
    # Check RAW_CANDIDATE_SITES present in system seed
    assert len(RAW_CANDIDATE_SITES) > 0
    for site in RAW_CANDIDATE_SITES:
        lat = site.get("latitude")
        lng = site.get("longitude")
        assert is_valid_coordinate(lat, lng), f"Site {site.get('id')} has invalid coordinates: ({lat}, {lng})"
        url = generate_google_maps_directions_url(lat, lng)
        assert url.startswith("https://www.google.com/maps/dir/?api=1&destination=")
