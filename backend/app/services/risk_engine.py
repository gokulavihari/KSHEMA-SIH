from typing import Dict, Any, List, Optional
from app.services.hazard_engine import calculate_hazard_scores

DEFAULT_WEIGHTS = {
    "flood_hazard": 0.20,
    "landslide_susceptibility": 0.18,
    "extreme_rainfall": 0.12,
    "slope_severity": 0.10,
    "river_proximity": 0.08,
    "historical_disasters": 0.10,
    "population_exposure": 0.08,
    "infrastructure_vulnerability": 0.07,
    "accessibility_penalty": 0.07
}

def classify_risk_score(score: Optional[float]) -> str:
    if score is None:
        return "UNKNOWN"
    if score <= 20.0:
        return "LOW"
    elif score <= 40.0:
        return "MODERATE"
    elif score <= 60.0:
        return "HIGH"
    elif score <= 80.0:
        return "VERY HIGH"
    else:
        return "CRITICAL"

def classify_vulnerability_score(score: Optional[float]) -> str:
    if score is None:
        return "UNKNOWN"
    if score <= 20.0:
        return "LOW"
    elif score <= 40.0:
        return "MODERATE"
    elif score <= 60.0:
        return "HIGH"
    elif score <= 80.0:
        return "VERY HIGH"
    else:
        return "CRITICAL"

def calculate_habitation_risk(habitation: dict, rainfall_multiplier: float = 1.0, custom_weights: Dict[str, float] = None) -> dict:
    weights = custom_weights if custom_weights else DEFAULT_WEIGHTS
    
    # Get dynamic hazard scores
    hazards = calculate_hazard_scores(habitation, rainfall_multiplier)
    
    # Normalized component factors (0-100)
    hist_disaster_score = min(100.0, habitation["historical_disaster_count"] * 20.0)
    pop_exposure_score = min(100.0, (habitation["population"] / 5000.0) * 100.0)
    infra_vuln_score = habitation["housing_vulnerability_score"]
    
    access_quality_map = {"Good": 20.0, "Moderate": 50.0, "Poor": 80.0, "Isolated": 100.0}
    access_penalty = access_quality_map.get(habitation["road_access_quality"], 50.0)
    
    components = {
        "flood_hazard": hazards["flood_hazard"],
        "landslide_susceptibility": hazards["landslide_susceptibility"],
        "extreme_rainfall": hazards["extreme_rainfall"],
        "slope_severity": hazards["slope_severity"],
        "river_proximity": hazards["river_proximity"],
        "historical_disasters": hist_disaster_score,
        "population_exposure": pop_exposure_score,
        "infrastructure_vulnerability": infra_vuln_score,
        "accessibility_penalty": access_penalty
    }
    
    # Weighted Sum
    total_weight = sum(weights.values())
    raw_risk = sum((components[k] * weights[k]) for k in weights) / (total_weight if total_weight > 0 else 1.0)
    
    # Clamp strictly between 0.0 and 100.0
    risk_score = round(max(0.0, min(100.0, raw_risk)), 1)
    risk_level = classify_risk_score(risk_score)
        
    # Build transparent factor explanations
    factor_descriptions = {
        "flood_hazard": "Riverine & flash flood inundation threat",
        "landslide_susceptibility": "Geological slope instability & runout potential",
        "extreme_rainfall": "Precipitation intensity & saturation index",
        "slope_severity": "Terrain gradient & steepness penalty",
        "river_proximity": "Proximity to active Himalayan drainage channels",
        "historical_disasters": "Frequency of past disaster occurrences",
        "population_exposure": "Demographic density at risk",
        "infrastructure_vulnerability": "Housing structural weakness rating",
        "accessibility_penalty": "Remoteness & emergency transport barrier"
    }
    
    factors = []
    for k in weights:
        contrib = round((components[k] * weights[k]), 1)
        factors.append({
            "factor": k.replace("_", " ").title(),
            "weight": weights[k],
            "raw_value": round(components[k], 1),
            "normalized_score": round(components[k], 1),
            "contribution": contrib,
            "description": factor_descriptions.get(k, "")
        })
        
    # Evidence confidence based on data completeness
    evidence_level = "HIGH" if habitation.get("historical_disaster_count", 0) > 0 else "MEDIUM"
    
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "exposure_score": round((pop_exposure_score * 0.5 + infra_vuln_score * 0.5), 1),
        "evidence_level": evidence_level,
        "factors": factors
    }
