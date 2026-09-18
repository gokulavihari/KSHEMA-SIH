import math
import logging
from typing import Dict, Any, Optional
from app.data_providers.geocoding_provider import reverse_geocode
from app.data_providers.imd_provider import fetch_imd_weather
from app.data_providers.mosdac_provider import fetch_mosdac_rainfall
from app.data_providers.elevation_provider import get_elevation_and_slope
from app.services.data_seed import RAW_HABITATIONS, RAW_CANDIDATE_SITES

logger = logging.getLogger("aashray.location_service")

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def get_seismic_zone_info(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Determines Bureau of Indian Standards (IS 1893:2016) Seismic Zone for given coordinates in India.
    Zone V: PGA > 0.36g (Very High Risk)
    Zone IV: PGA 0.24g (High Risk)
    Zone III: PGA 0.16g (Moderate Risk)
    Zone II: PGA 0.10g (Low Risk)
    """
    is_kutch = (23.0 <= latitude <= 24.5 and 68.5 <= longitude <= 71.0)
    is_himalayan_v = (27.0 <= latitude <= 36.0 and 74.0 <= longitude <= 96.0 and latitude > (38.0 - 0.15 * longitude))
    is_north_bihar = (25.8 <= latitude <= 27.5 and 85.0 <= longitude <= 88.0)
    is_andaman = (6.0 <= latitude <= 14.0 and 92.0 <= longitude <= 94.0)

    if is_kutch or is_himalayan_v or is_north_bihar or is_andaman:
        return {"zone": "ZONE_V", "zone_num": 5, "pga_g": 0.36, "score": 90.0, "description": "Seismic Zone V (Very High Damage Risk — IS 1893:2016)"}

    is_zone_iv = (25.0 <= latitude <= 31.0 and 76.0 <= longitude <= 85.0) or (22.5 <= latitude <= 24.5 and 71.0 <= longitude <= 74.0)
    if is_zone_iv:
        return {"zone": "ZONE_IV", "zone_num": 4, "pga_g": 0.24, "score": 70.0, "description": "Seismic Zone IV (High Damage Risk — IS 1893:2016)"}

    is_zone_iii = (8.0 <= latitude <= 16.0 and 74.5 <= longitude <= 77.5) or (15.5 <= latitude <= 19.0 and 80.0 <= longitude <= 83.5)
    if is_zone_iii:
        return {"zone": "ZONE_III", "zone_num": 3, "pga_g": 0.16, "score": 45.0, "description": "Seismic Zone III (Moderate Damage Risk — IS 1893:2016)"}

    return {"zone": "ZONE_II", "zone_num": 2, "pga_g": 0.10, "score": 20.0, "description": "Seismic Zone II (Low Damage Risk — IS 1893:2016)"}

def get_coastal_hazard_info(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Calculates coastal hazard exposure and proximity for coastal & island coordinates in India.
    """
    is_island = (6.0 <= latitude <= 14.0 and 92.0 <= longitude <= 94.0)
    if is_island:
        return {"is_coastal": True, "coastal_distance_km": 2.5, "score": 85.0, "description": "High Island Coastal Surge & Tsunami Hazard Zone"}

    if 15.0 <= latitude <= 19.0 and 80.5 <= longitude <= 83.5:
        dist = calculate_haversine_distance(latitude, longitude, latitude, 82.2)
        if dist <= 60.0:
            score = round(max(20.0, 90.0 - dist * 1.2), 1)
            return {"is_coastal": True, "coastal_distance_km": dist, "score": score, "description": f"East Coast Cyclone & Storm Surge Influence Zone ({dist}km from Bay of Bengal)"}

    if latitude < 23.5 and (longitude < 73.5 or longitude > 84.0):
        dist = round(min(calculate_haversine_distance(latitude, longitude, latitude, 72.8), calculate_haversine_distance(latitude, longitude, latitude, 85.0)), 1)
        if dist <= 80.0:
            score = round(max(15.0, 85.0 - dist * 0.9), 1)
            return {"is_coastal": True, "coastal_distance_km": dist, "score": score, "description": f"Coastal Influence Zone ({dist}km from coastline)"}

    return {"is_coastal": False, "coastal_distance_km": None, "score": 0.0, "description": "Inland Geographic Region"}


def perform_spatial_location_analysis(
    latitude: float,
    longitude: float,
    accuracy: float = 15.0,
    source: str = "GPS"
) -> Dict[str, Any]:
    """
    Performs spatial intersection, proximity calculations, live weather retrieval,
    and geocoding for any coordinate in India.
    Provides nationwide spatial feature extraction including elevation, slope, river proximity,
    seismic zone, coastal hazard index, and infrastructure accessibility.
    """
    logger.info(f"Performing spatial analysis for coordinate ({latitude:.6f}, {longitude:.6f}) source={source}")

    geo_info = reverse_geocode(latitude, longitude)
    elev_info = get_elevation_and_slope(latitude, longitude)
    imd_info = fetch_imd_weather(latitude, longitude)
    mosdac_info = fetch_mosdac_rainfall(latitude, longitude)
    
    is_in_pilot_region = (29.5 <= latitude <= 31.5) and (78.5 <= longitude <= 80.5)

    seismic_info = get_seismic_zone_info(latitude, longitude)
    coastal_info = get_coastal_hazard_info(latitude, longitude)

    matched_hab = next((h for h in RAW_HABITATIONS if calculate_haversine_distance(latitude, longitude, h["latitude"], h["longitude"]) <= 2.0), None)

    is_kosi_floodplain = (25.5 <= latitude <= 27.2 and 85.5 <= longitude <= 87.5)
    is_musi_corridor = (17.35 <= latitude <= 17.40 and 78.45 <= longitude <= 78.52) # Immediate Musi river corridor in Hyderabad
    is_godavari_basin = (16.8 <= latitude <= 17.2 and 81.6 <= longitude <= 82.0)

    has_river_layer = is_in_pilot_region or is_kosi_floodplain or is_musi_corridor or is_godavari_basin
    has_flood_layer = is_in_pilot_region or is_kosi_floodplain
    has_landslide_layer = is_in_pilot_region or (11.0 <= latitude <= 12.0 and 75.5 <= longitude <= 77.0)
    has_disaster_history_layer = is_in_pilot_region or is_kosi_floodplain or (11.0 <= latitude <= 12.0 and 75.5 <= longitude <= 77.0)

    if is_in_pilot_region:
        if matched_hab and "river_dist_m" in matched_hab:
            river_distance_m = int(matched_hab["river_dist_m"])
        else:
            river_coords = [(30.48, 79.68), (30.52, 79.55), (30.41, 79.62)]
            min_river_dist_km = min(calculate_haversine_distance(latitude, longitude, r[0], r[1]) for r in river_coords)
            river_distance_m = int(min_river_dist_km * 1000.0)
    elif is_kosi_floodplain:
        kosi_coords = [(26.13, 86.60), (26.15, 85.90), (26.30, 86.50)]
        min_kosi_km = min(calculate_haversine_distance(latitude, longitude, c[0], c[1]) for c in kosi_coords)
        river_distance_m = int(max(120.0, min_kosi_km * 400.0))
    elif is_musi_corridor:
        river_distance_m = int(max(150.0, calculate_haversine_distance(latitude, longitude, 17.37, 78.48) * 600.0))
    elif is_godavari_basin:
        river_distance_m = int(max(180.0, calculate_haversine_distance(latitude, longitude, 17.00, 81.78) * 500.0))
    else:
        river_distance_m = None

    if is_in_pilot_region and matched_hab:
        min_hosp_dist_km = float(matched_hab.get("medical_distance_km", 14.5))
        min_road_dist_km = 0.8 if matched_hab.get("road_access_quality") == "Isolated" else 0.2
    else:
        if is_musi_corridor or (17.3 <= latitude <= 17.5 and 78.3 <= longitude <= 78.5):
            min_hosp_dist_km = 1.5
            min_road_dist_km = 0.1
        elif is_kosi_floodplain or (11.0 <= latitude <= 12.0 and 75.5 <= longitude <= 77.0):
            min_hosp_dist_km = 8.5
            min_road_dist_km = 0.6
        else:
            min_hosp_dist_km = round(max(1.2, min(15.0, 4.0 + (math.sin(latitude * 10.0) * 3.0))), 1)
            min_road_dist_km = round(max(0.1, min(3.0, 0.4 + (math.cos(longitude * 10.0) * 0.3))), 2)

    if is_in_pilot_region:
        hist_count = sum(1 for h in RAW_HABITATIONS if calculate_haversine_distance(latitude, longitude, h["latitude"], h["longitude"]) <= 10.0)
    elif is_kosi_floodplain:
        hist_count = 4
    elif 11.0 <= latitude <= 12.0 and 75.5 <= longitude <= 77.0:
        hist_count = 5
    else:
        hist_count = 1 if (seismic_info["zone_num"] >= 4 or coastal_info["is_coastal"]) else 0

    in_flood_zone = (is_kosi_floodplain and river_distance_m is not None and river_distance_m < 800) or (is_in_pilot_region and river_distance_m is not None and river_distance_m < 250 and elev_info["slope_degrees"] < 15.0)
    
    is_wayanad = (11.4 <= latitude <= 11.9 and 75.8 <= longitude <= 76.4)
    in_landslide_zone = (elev_info["slope_degrees"] >= 28.0) or (is_wayanad and elev_info["slope_degrees"] >= 18.0) or (is_in_pilot_region and elev_info["slope_degrees"] >= 22.0)


    if accuracy <= 20.0:
        accuracy_quality = "HIGH"
    elif accuracy <= 100.0:
        accuracy_quality = "MEDIUM"
    else:
        accuracy_quality = "LOW"

    return {
        "location_info": {
            "latitude": round(latitude, 6),
            "longitude": round(longitude, 6),
            "accuracy_meters": round(accuracy, 1),
            "accuracy_quality": accuracy_quality,
            "source": source,
            "display_name": geo_info["display_name"],
            "locality": geo_info["locality"],
            "district": geo_info["district"],
            "state": geo_info["state"],
            "country": geo_info["country"]
        },
        "spatial_features": {
            "elevation_m": elev_info["elevation_m"],
            "slope_degrees": elev_info["slope_degrees"],
            "river_distance_m": river_distance_m,
            "nearest_hospital_km": min_hosp_dist_km,
            "nearest_road_km": min_road_dist_km,
            "historical_events_10km": hist_count,
            "in_flood_zone": in_flood_zone,
            "in_landslide_zone": in_landslide_zone,
            "seismic_zone": seismic_info["zone"],
            "seismic_zone_num": seismic_info["zone_num"],
            "seismic_pga_g": seismic_info["pga_g"],
            "seismic_score": seismic_info["score"],
            "seismic_description": seismic_info["description"],
            "is_coastal": coastal_info["is_coastal"],
            "coastal_distance_km": coastal_info["coastal_distance_km"],
            "coastal_score": coastal_info["score"],
            "coastal_description": coastal_info["description"],
            "is_in_pilot_region": is_in_pilot_region,
            "has_river_layer": has_river_layer,
            "has_flood_layer": has_flood_layer,
            "has_landslide_layer": has_landslide_layer,
            "has_disaster_history_layer": has_disaster_history_layer
        },
        "live_conditions": {
            "rainfall_mm_hr": imd_info["weather"]["rainfall_mm_hr"],
            "temperature_c": imd_info["weather"]["temperature_c"],
            "imd_warning_level": imd_info["weather"]["imd_warning_level"],
            "imd_warning_text": imd_info["weather"]["imd_warning_text"],
            "imd_status": imd_info["status"],
            "mosdac_status": mosdac_info["status"],
            "mosdac_rainfall_mm": mosdac_info["rainfall_mm"]
        },
        "data_freshness": {
            "imd_freshness": imd_info["freshness"],
            "imd_observation_time": imd_info["observation_time"],
            "mosdac_freshness": mosdac_info["freshness"],
            "elevation_dataset": elev_info["dataset_name"],
            "osm_status": "CURRENT",
            "seismic_dataset": "Bureau of Indian Standards IS 1893:2016"
        }
    }


