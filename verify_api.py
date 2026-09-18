import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from app.main import app

def test_api():
    print("--- TESTING ALL 21 MANDATORY AASHRAY API ENDPOINTS ---")
    client = TestClient(app)
    
    # 1. Health
    r = client.get("/api/health")
    print(f"1. GET /api/health: {r.status_code} | {r.json()['system']}")
    assert r.status_code == 200

    # 2. Dashboard
    r = client.get("/api/dashboard")
    kpis = r.json()['kpis']
    print(f"2. GET /api/dashboard: {r.status_code} | Pop at Risk: {kpis['population_at_risk']} | Safe Cap Util: {kpis['capacity_utilization_pct']}%")
    assert r.status_code == 200

    # 3. Habitations
    r = client.get("/api/habitations")
    print(f"3. GET /api/habitations: {r.status_code} | Total Habitations: {len(r.json())}")
    assert r.status_code == 200

    # 4. Habitation Detail
    r = client.get("/api/habitations/HAB-001")
    print(f"4. GET /api/habitations/HAB-001: {r.status_code} | Name: {r.json()['name']} | Risk: {r.json()['risk_score']}")
    assert r.status_code == 200

    # 5. Risk Map
    r = client.get("/api/risk-map")
    habs_cnt = len(r.json()['habitations']['features'])
    redzones_cnt = len(r.json()['red_zones']['features'])
    rivers_cnt = len(r.json()['rivers']['features'])
    print(f"5. GET /api/risk-map: {r.status_code} | Habs: {habs_cnt} | Red Zones: {redzones_cnt} | Rivers: {rivers_cnt}")
    assert r.status_code == 200

    # 6. Hazards
    r = client.get("/api/hazards")
    print(f"6. GET /api/hazards: {r.status_code} | Multipliers: {r.json()['rainfall_multiplier']}")
    assert r.status_code == 200

    # 7. Relocation Sites
    r = client.get("/api/relocation-sites")
    print(f"7. GET /api/relocation-sites: {r.status_code} | Total Sites: {len(r.json())}")
    assert r.status_code == 200

    # 8. Relocation Site Detail
    r = client.get("/api/relocation-sites/SITE-001")
    print(f"8. GET /api/relocation-sites/SITE-001: {r.status_code} | Name: {r.json()['name']} | Effective Cap: {r.json()['capacity']['effective_capacity']}")
    assert r.status_code == 200

    # 9. Calculate Risk
    r = client.post("/api/calculate-risk", json={"habitation_id": "HAB-001", "rainfall_multiplier": 1.5})
    print(f"9. POST /api/calculate-risk: {r.status_code} | Calculated Risk: {r.json()['risk_score']}")
    assert r.status_code == 200

    # 10. Relocation Plan
    r = client.post("/api/relocation-plan", json={"habitation_id": "HAB-001"})
    plan = r.json()
    print(f"10. POST /api/relocation-plan: {r.status_code} | Plan ID: {plan['plan_id']} | Status: {plan['status']} | Allocated: {plan['allocated_population']}")
    assert r.status_code == 200

    # 11. Capacity
    r = client.get("/api/capacity")
    print(f"11. GET /api/capacity: {r.status_code} | Matrix Sites: {len(r.json())}")
    assert r.status_code == 200

    # 12. Alerts
    r = client.get("/api/alerts")
    print(f"12. GET /api/alerts: {r.status_code} | Active Alerts: {len(r.json())}")
    assert r.status_code == 200

    # 13. Simulate Extreme Rainfall
    r = client.post("/api/simulate/extreme-rainfall", json={"rainfall_multiplier": 2.5})
    sim = r.json()
    print(f"13. POST /api/simulate/extreme-rainfall: {r.status_code} | Delta Pop at Risk: {sim['delta']['population_at_risk_delta']}")
    assert r.status_code == 200

    # 14. Reset Simulation
    r = client.post("/api/simulate/reset")
    print(f"14. POST /api/simulate/reset: {r.status_code} | Message: {r.json()['message']}")
    assert r.status_code == 200

    # 15. Data Sources
    r = client.get("/api/data-sources")
    print(f"15. GET /api/data-sources: {r.status_code} | Data Sources Count: {len(r.json())}")
    assert r.status_code == 200

    # 16. Location Assess
    r = client.post("/api/location/assess", json={"latitude": 30.4852, "longitude": 79.6914, "accuracy": 15.0, "source": "GPS"})
    print(f"16. POST /api/location/assess: {r.status_code} | Risk: {r.json()['risk_score']} | Dominant: {r.json()['dominant_hazard']}")
    assert r.status_code == 200

    # 17. Location Resolve
    r = client.post("/api/location/resolve", json={"latitude": 30.4852, "longitude": 79.6914})
    print(f"17. POST /api/location/resolve: {r.status_code} | Locality: {r.json()['locality']}")
    assert r.status_code == 200

    # 18. Location Relocation Options
    r = client.post("/api/location/relocation-options", json={"latitude": 30.4852, "longitude": 79.6914, "population_to_relocate": 1250, "risk_level": "CRITICAL"})
    print(f"18. POST /api/location/relocation-options: {r.status_code} | Status: {r.json()['status']} | Recommended: {r.json()['recommended_site']['name']}")
    assert r.status_code == 200

    # 19. Data Sources Status
    r = client.get("/api/data-sources/status")
    print(f"19. GET /api/data-sources/status: {r.status_code} | Total Providers: {len(r.json())}")
    assert r.status_code == 200

    # 20. Debug Relocation Sites Summary
    r = client.get("/api/debug/relocation-sites-summary")
    print(f"20. GET /api/debug/relocation-sites-summary: {r.status_code} | Total Sites: {r.json()['summary']['total_site_count']} | Safe: {r.json()['summary']['safe_sites_count']}")
    assert r.status_code == 200

    # 21. Debug Database Readiness Audit
    r = client.get("/api/debug/database-readiness")
    metrics = r.json()['metrics']
    print(f"21. GET /api/debug/database-readiness: {r.status_code} | Status: {r.json()['status']} | Habs: {metrics['total_habitations']} | Sites: {metrics['total_relocation_sites']}")
    assert r.status_code == 200

    print("==================================================")
    print("ALL 21 API ENDPOINTS TESTED & VERIFIED OPERATIONAL!")
    print("==================================================")


if __name__ == "__main__":
    test_api()
