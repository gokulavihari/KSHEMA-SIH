import math
from typing import List, Dict, Any

def calculate_hazard_scores(habitation: dict, rainfall_multiplier: float = 1.0) -> dict:
    """
    Computes normalized multi-hazard inputs considering extreme rainfall simulation multiplier.
    """
    raw_landslide = habitation.get("raw_landslide", habitation.get("landslide_susceptibility", 50.0))
    raw_flood = habitation.get("raw_flood", habitation.get("flood_hazard", 50.0))
    slope = habitation.get("raw_slope", habitation.get("slope_severity", 20.0))
    river_dist = habitation.get("river_dist_m", habitation.get("river_proximity", 500.0))
    
    # Dynamic rainfall scaling
    simulated_rainfall_intensity = min(100.0, 50.0 * rainfall_multiplier)
    
    # Flood hazard scales dynamically with rainfall multiplier and river proximity
    proximity_factor = max(0.0, 1.0 - (river_dist / 1000.0))
    flood_hazard = min(100.0, raw_flood * (0.6 + 0.4 * rainfall_multiplier) + (proximity_factor * 15.0))
    
    # Landslide hazard scales with slope severity and rainfall saturation
    slope_factor = min(1.0, slope / 40.0)
    landslide_hazard = min(100.0, raw_landslide * (0.7 + 0.3 * rainfall_multiplier) * (0.5 + 0.5 * slope_factor))
    
    # River proximity score (0-100, 100 = adjacent to river)
    river_proximity_score = max(0.0, min(100.0, (1.0 - (river_dist / 1200.0)) * 100.0))
    
    # Slope severity score (0-100)
    slope_severity_score = min(100.0, (slope / 45.0) * 100.0)
    
    return {
        "flood_hazard": round(flood_hazard, 1),
        "landslide_susceptibility": round(landslide_hazard, 1),
        "extreme_rainfall": round(simulated_rainfall_intensity, 1),
        "slope_severity": round(slope_severity_score, 1),
        "river_proximity": round(river_proximity_score, 1)
    }

def generate_red_zones(habitations_data: List[dict]) -> dict:
    """
    Generates GeoJSON FeatureCollection of Red-Zone hazard polygons for high-risk habitations.
    """
    features = []
    
    for hab in habitations_data:
        # Create Red Zone polygon buffer for high risk habitations (risk >= 60.0 or landslide/flood >= 75.0)
        if hab["risk_score"] >= 60.0 or hab["raw_landslide"] >= 75.0 or hab["raw_flood"] >= 75.0:
            lat = hab["latitude"]
            lng = hab["longitude"]
            
            # Buffer radius based on risk score (approx ~0.005 to 0.012 degrees ~ 500m to 1.2km)
            buffer_deg = 0.004 + (hab["risk_score"] / 100.0) * 0.008
            
            # Create octagonal polygon geometry representing Red-Zone boundary
            coords = []
            for i in range(8):
                angle = (i * 45) * (math.pi / 180.0)
                d_lat = buffer_deg * math.cos(angle)
                d_lng = (buffer_deg / math.cos(math.radians(lat))) * math.sin(angle)
                coords.append([round(lng + d_lng, 5), round(lat + d_lat, 5)])
            coords.append(coords[0]) # Close polygon ring
            
            features.append({
                "type": "Feature",
                "properties": {
                    "zone_id": f"REDZONE-{hab['id']}",
                    "habitation_id": hab["id"],
                    "habitation_name": hab["name"],
                    "risk_score": hab["risk_score"],
                    "dominant_hazard": hab["dominant_hazard"],
                    "confidence": hab["evidence_level"],
                    "created_at": "2026-09-09T22:00:00Z"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords]
                }
            })
            
    return {
        "type": "FeatureCollection",
        "features": features
    }
