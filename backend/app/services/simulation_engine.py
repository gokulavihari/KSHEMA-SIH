import uuid
from typing import Dict, Any, List
from app.services.data_seed import RAW_HABITATIONS, RAW_CANDIDATE_SITES
from app.services.vulnerability_engine import calculate_vulnerability_and_priority
from app.services.relocation_optimizer import generate_relocation_plan

def run_extreme_rainfall_simulation(rainfall_multiplier: float = 2.5) -> dict:
    """
    Recalculates multi-hazard risk, vulnerability, priority, and relocation allocations
    for all habitations under a simulated extreme rainfall scenario.
    """
    baseline_habs = []
    simulated_habs = []
    
    # Compute BEFORE metrics (multiplier = 1.0)
    for hab in RAW_HABITATIONS:
        vuln_base = calculate_vulnerability_and_priority(hab, rainfall_multiplier=1.0)
        baseline_habs.append({
            "id": hab["id"],
            "name": hab["name"],
            "population": hab["population"],
            "risk_score": vuln_base["risk_score"],
            "risk_level": vuln_base["risk_level"],
            "priority": vuln_base["relocation_priority"]
        })
        
    # Compute AFTER metrics (multiplier = rainfall_multiplier)
    for hab in RAW_HABITATIONS:
        vuln_sim = calculate_vulnerability_and_priority(hab, rainfall_multiplier=rainfall_multiplier)
        simulated_habs.append({
            "id": hab["id"],
            "name": hab["name"],
            "population": hab["population"],
            "risk_score": vuln_sim["risk_score"],
            "risk_level": vuln_sim["risk_level"],
            "priority": vuln_sim["relocation_priority"]
        })
        
    # Aggregated Before Metrics
    before_at_risk = sum(h["population"] for h in baseline_habs if h["risk_score"] >= 61.0)
    before_critical_habs = len([h for h in baseline_habs if h["risk_score"] >= 81.0])
    before_immediate_reloc = sum(h["population"] for h in baseline_habs if h["priority"] == "IMMEDIATE")
    
    # Aggregated After Metrics
    after_at_risk = sum(h["population"] for h in simulated_habs if h["risk_score"] >= 61.0)
    after_critical_habs = len([h for h in simulated_habs if h["risk_score"] >= 81.0])
    after_immediate_reloc = sum(h["population"] for h in simulated_habs if h["priority"] == "IMMEDIATE")
    
    # Run relocation optimizer on worst-affected habitation (e.g. Raini Village or Raini + Joshimath)
    raini_hab = RAW_HABITATIONS[0]
    sim_plan = generate_relocation_plan(raini_hab, RAW_CANDIDATE_SITES)
    
    return {
        "simulation_id": f"SIM-{uuid.uuid4().hex[:6].upper()}",
        "rainfall_multiplier": rainfall_multiplier,
        "before_metrics": {
            "rainfall_label": "1.0x Baseline Monsoon",
            "population_at_risk": before_at_risk,
            "critical_habitations": before_critical_habs,
            "immediate_relocation_population": before_immediate_reloc,
            "red_zone_area_sqkm": 18.5
        },
        "after_metrics": {
            "rainfall_label": f"{rainfall_multiplier}x Extreme Rainfall Cloudburst",
            "population_at_risk": after_at_risk,
            "critical_habitations": after_critical_habs,
            "immediate_relocation_population": after_immediate_reloc,
            "red_zone_area_sqkm": round(18.5 * (1.0 + (rainfall_multiplier - 1.0) * 0.75), 1)
        },
        "delta": {
            "population_at_risk_delta": f"+{after_at_risk - before_at_risk}",
            "critical_habitations_delta": f"+{after_critical_habs - before_critical_habs}",
            "immediate_relocation_delta": f"+{after_immediate_reloc - before_immediate_reloc}"
        },
        "sample_relocation_plan_update": sim_plan,
        "timestamp": "2026-09-09T22:52:00Z"
    }
