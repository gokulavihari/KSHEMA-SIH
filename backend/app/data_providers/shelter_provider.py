import math
import logging
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.services.location_service import calculate_haversine_distance
from app.services.data_seed import RAW_CANDIDATE_SITES
from app.data_providers.geocoding_provider import reverse_geocode

logger = logging.getLogger("aashray.shelter_provider")

def classify_shelter_record(site: Dict[str, Any]) -> Dict[str, Any]:
    """
    Classifies shelter candidates into 3 distinct categories according to SIH verification rules:
    - VERIFIED_SHELTER: Capacity & safety verified by official SDMA/DDMA authority.
    - POTENTIAL_CANDIDATE: OSM public facility (school, hospital, community hall) requiring field verification.
    - DEMO_SHELTER: Clearly labeled prototype fallback candidate.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    site_copy = dict(site)

    cand_origin = site_copy.get("candidate_origin")
    if not cand_origin:
        if site_copy.get("source_type") == "OFFICIAL_SDMA_REGISTRY" or site_copy.get("verification_status") in ["VERIFIED_OFFICIAL", "VERIFIED_FIELD"]:
            cand_origin = "STATIC_SDMA"
        elif site_copy.get("source_type") in ["LIVE_OSM", "OSM_OVERPASS"]:
            cand_origin = "LIVE_OSM"
        elif site_copy.get("is_demonstration") or site_copy.get("source_type") in ["DEMONSTRATION_DATA", "ESTIMATED_FALLBACK"]:
            cand_origin = "ESTIMATED_FALLBACK"
        else:
            cand_origin = "CACHED_GIS"

    is_synth = site_copy.get("is_synthetic", cand_origin == "ESTIMATED_FALLBACK")
    is_fall = site_copy.get("is_fallback", cand_origin == "ESTIMATED_FALLBACK")
    ver_status = site_copy.get("verification_status", "UNVERIFIED")

    if ver_status in ["VERIFIED_OFFICIAL", "VERIFIED_FIELD"]:
        category = "VERIFIED_SHELTER"
        status = "VERIFIED_RELOCATION_SITE"
        ver_label = ver_status
        capacity_verified = True
        capacity_status = "VERIFIED"
        source_status = "STATIC"
    elif cand_origin in ["LIVE_OSM", "CACHED_GIS", "ESTIMATED_FALLBACK"]:
        is_demo = site_copy.get("is_demonstration", False)
        category = site_copy.get("category") or ("DEMO_SHELTER" if is_demo else "POTENTIAL_CANDIDATE")
        status = site_copy.get("status") or ("ESTIMATED_DEMO_CANDIDATE" if is_demo else "POTENTIAL_RELOCATION_CANDIDATE")
        ver_label = "FIELD_VERIFICATION_REQUIRED"
        capacity_verified = False
        capacity_status = "ESTIMATED" if cand_origin in ["LIVE_OSM", "CACHED_GIS"] else "UNKNOWN"
        source_status = "LIVE" if cand_origin == "LIVE_OSM" else ("CACHED" if cand_origin == "CACHED_GIS" else "ESTIMATED")

    site_copy["candidate_origin"] = cand_origin
    site_copy["is_synthetic"] = is_synth
    site_copy["is_fallback"] = is_fall
    site_copy["category"] = category
    site_copy["status"] = status
    site_copy["verification_status_label"] = ver_label
    site_copy["capacity_verified"] = capacity_verified
    site_copy["capacity_status"] = capacity_status
    site_copy["source_status"] = source_status
    site_copy["retrieved_at"] = site_copy.get("retrieved_at", now_str)

    if not capacity_verified:
        site_copy["capacity_notes"] = "Capacity UNKNOWN — DDMA/SDMA field verification required before disaster population allocation"

    if not site_copy.get("source_reference"):
        if cand_origin == "STATIC_SDMA":
            site_copy["source_reference"] = f"Official SDMA Registry Record ({site_copy.get('site_id', 'SDMA-KEY')})"
        elif cand_origin == "LIVE_OSM":
            site_copy["source_reference"] = f"OpenStreetMap Overpass POI #{site_copy.get('site_id', 'OSM-NODE')}"
        else:
            site_copy["source_reference"] = f"AASHRAY Multi-Directional Grid Model — DDMA Field Confirmation Required"

    if capacity_status == "UNKNOWN":
        site_copy["capacity_notes"] = "Capacity UNKNOWN — DDMA/SDMA field verification required before disaster population allocation"

    return site_copy


def fetch_osm_overpass_candidates(latitude: float, longitude: float, radius_km: float = 25.0) -> List[Dict[str, Any]]:
    """
    Attempts to query live OpenStreetMap Overpass API for real public facility POIs near coordinates.
    Returns real OSM nodes with actual names, real lat/lon, and OSM IDs.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    radius_m = min(50000, int(radius_km * 1000))
    query = f"""[out:json][timeout:2];
(
  node["amenity"~"school|hospital|community_centre|townhall|college|shelter|public_building"](around:{radius_m},{latitude},{longitude});
);
out center 15;"""

    url = "https://overpass-api.de/api/interpreter"
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "AASHRAY-SIH-DisasterEngine/2.0"})

    osm_candidates = []
    try:
        with urllib.request.urlopen(req, timeout=2.0) as resp:
            if resp.status == 200:
                raw_json = json.loads(resp.read().decode("utf-8"))
                elements = raw_json.get("elements", [])
                for elem in elements:
                    tags = elem.get("tags", {})
                    elem_lat = elem.get("lat") or elem.get("center", {}).get("lat")
                    elem_lon = elem.get("lon") or elem.get("center", {}).get("lon")
                    if elem_lat is None or elem_lon is None:
                        continue

                    raw_name = tags.get("name") or tags.get("name:en")
                    amenity_type = tags.get("amenity", "public_facility").replace("_", " ").title()
                    osm_id = elem.get("id", "0000")

                    if not raw_name:
                        raw_name = f"Public {amenity_type} (OSM Node #{osm_id})"

                    dist = calculate_haversine_distance(latitude, longitude, elem_lat, elem_lon)
                    site_id = f"OSM-NODE-{osm_id}"

                    c_site = {
                        "site_id": site_id,
                        "id": site_id,
                        "name": raw_name,
                        "latitude": round(elem_lat, 6),
                        "longitude": round(elem_lon, 6),
                        "site_type": f"OSM {amenity_type}",
                        "source_type": "LIVE_OSM",
                        "source_url": f"https://www.openstreetmap.org/node/{osm_id}",
                        "source_reference": f"OpenStreetMap Node #{osm_id}",
                        "candidate_origin": "LIVE_OSM",
                        "is_synthetic": False,
                        "is_fallback": False,
                        "verification_status": "UNVERIFIED",
                        "verification_status_label": "FIELD_VERIFICATION_REQUIRED",
                        "status": "POTENTIAL_RELOCATION_CANDIDATE",
                        "category": "POTENTIAL_CANDIDATE",
                        "capacity_status": "ESTIMATED",
                        "source_status": "LIVE",
                        "retrieved_at": now_str,
                        "is_safe": True,
                        "safety_score": 85.0,
                        "suitability_score": 80.0,
                        "land_area_sqm": 4000,
                        "sanitation_cap": 600,
                        "healthcare_cap": 600,
                        "education_cap": 600,
                        "road_cap": 600,
                        "emergency_cap": 600,
                        "effective_capacity": 600,
                        "capacity_verified": False,
                        "used_capacity": 0,
                        "water_lpd": 15000,
                        "nearest_hospital_km": 3.0,
                        "road_accessibility": "Good",
                        "distance_km": round(dist, 2),
                        "is_demonstration": False,
                        "is_name_generated": False,
                        "is_coord_generated": False
                    }
                    osm_candidates.append(classify_shelter_record(c_site))
    except Exception as e:
        logger.debug(f"OSM Overpass API live fetch bypassed: {e}")

    return osm_candidates


def fetch_nationwide_shelter_candidates(
    latitude: float,
    longitude: float,
    radius_km: float = 50.0,
    include_demo: bool = True,
    include_unverified: bool = True
) -> List[Dict[str, Any]]:
    """
    Retrieves safe shelter candidates across any location in India.
    1. Searches indexed SDMA candidate database.
    2. Queries live OSM Overpass API for real public POIs (if available).
    3. If no external candidate is found, generates a multi-directional 8-point compass grid
       (North, South, East, West, NE, NW, SE, SW) with explicit ESTIMATED_DEMO_CANDIDATE labels.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    candidates = []

    # 1. Search indexed SDMA candidate sites
    for s in RAW_CANDIDATE_SITES:
        s_lat = s.get("latitude")
        s_lon = s.get("longitude")
        if s_lat is None or s_lon is None:
            continue

        dist = calculate_haversine_distance(latitude, longitude, s_lat, s_lon)
        if dist <= radius_km:
            classified = classify_shelter_record(s)
            classified["distance_km"] = dist
            candidates.append(classified)

    # 2. Try fetching live OSM POIs
    if include_unverified:
        osm_pois = fetch_osm_overpass_candidates(latitude, longitude, radius_km)
        candidates.extend(osm_pois)

    # 3. Controlled Multi-Directional 8-Point Fallback Grid Generation
    # Triggers when external candidate count within radius is insufficient
    if include_unverified and len(candidates) < 3:
        geo_meta = reverse_geocode(latitude, longitude)
        locality = geo_meta.get("locality") or "Regional Sector"
        district = geo_meta.get("district") or "District"

        # Multi-Directional Grid Offsets (N, S, E, W, NE, NW, SE, SW) to guarantee diverse bearings across locations!
        raw_grid_directions = [
            ("North-East", 0.025, 0.025, 3.5, "Panchayat Community Centre & Relief Ground"),
            ("North-West", 0.035, -0.030, 4.8, "Government Primary Health Sub-Centre"),
            ("South-East", -0.040, 0.035, 5.9, "Public Secondary School & Assembly Hall"),
            ("South-West", -0.050, -0.045, 7.2, "Sub-Divisional Sports Complex Ground"),
            ("North", 0.065, 0.000, 7.2, "Municipal Evacuation Staging Facility"),
            ("South", -0.080, 0.000, 8.9, "Regional Relief Warehouse & Ground"),
            ("East", 0.000, 0.090, 10.0, "District Agricultural Assembly Yard"),
            ("West", 0.000, -0.100, 11.1, "Government Polytechnic College Campus")
        ]
        dir_shift = int((abs(latitude * 100) + abs(longitude * 100)) % 8)
        grid_directions = raw_grid_directions[dir_shift:] + raw_grid_directions[:dir_shift]

        for dir_name, lat_off, lon_off, base_dist, fac_type in grid_directions:
            c_lat = round(latitude + lat_off, 6)
            c_lon = round(longitude + lon_off, 6)
            dist_km = calculate_haversine_distance(latitude, longitude, c_lat, c_lon)

            if dist_km <= radius_km and (-90.0 <= c_lat <= 90.0 and -180.0 <= c_lon <= 180.0):
                site_id = f"EST-GRID-{abs(hash(f'{c_lat}-{c_lon}')) % 10000:04d}"
                explicit_name = f"Estimated candidate near {locality} ({c_lat:.2f}°N, {c_lon:.2f}°E) — DDMA verification required"

                c_site = {
                    "site_id": site_id,
                    "id": site_id,
                    "name": explicit_name,
                    "address": f"Near {locality}, {district}",
                    "district": district,
                    "subdistrict": locality,
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "site_type": fac_type,
                    "source_type": "ESTIMATED_FALLBACK",
                    "source_url": "https://aashray.sih.gov.in/spatial-grid",
                    "source_reference": f"AASHRAY Multi-Directional Grid Generator ({dir_name})",
                    "candidate_origin": "ESTIMATED_FALLBACK",
                    "is_synthetic": True,
                    "is_fallback": True,
                    "verification_status": "UNVERIFIED",
                    "verification_status_label": "FIELD_VERIFICATION_REQUIRED",
                    "status": "POTENTIAL_RELOCATION_CANDIDATE",
                    "category": "POTENTIAL_CANDIDATE",
                    "capacity_status": "UNKNOWN",
                    "source_status": "ESTIMATED",
                    "retrieved_at": now_str,
                    "is_safe": True,
                    "safety_score": 82.0,
                    "suitability_score": 78.0,
                    "land_area_sqm": 3500,
                    "sanitation_cap": 500,
                    "healthcare_cap": 500,
                    "education_cap": 500,
                    "road_cap": 500,
                    "emergency_cap": 500,
                    "effective_capacity": 500,
                    "capacity_verified": False,
                    "capacity_notes": "Capacity UNKNOWN — DDMA/SDMA field verification required before disaster population allocation",
                    "used_capacity": 0,
                    "water_lpd": 12000,
                    "nearest_hospital_km": round(min(8.0, dist_km * 0.5), 1),
                    "nearest_school_km": 1.0,
                    "road_accessibility": "Good",
                    "distance_km": round(dist_km, 2),
                    "is_demonstration": True,
                    "is_name_generated": True,
                    "is_coord_generated": True
                }
                candidates.append(classify_shelter_record(c_site))

    # Filter based on flags
    filtered = []
    for c in candidates:
        if not include_demo and c.get("is_demonstration", False):
            continue
        if not include_unverified and c.get("verification_status") not in ["VERIFIED_OFFICIAL", "VERIFIED_FIELD"]:
            continue
        filtered.append(c)

    # Deduplicate candidates by site_id
    seen = set()
    dedup = []
    for c in filtered:
        cid = c.get("site_id", c.get("id"))
        if cid and cid not in seen:
            seen.add(cid)
            dedup.append(c)

    dedup.sort(key=lambda x: x.get("distance_km", 999.0))
    return dedup
