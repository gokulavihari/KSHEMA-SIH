import httpx

def test_full_system():
    print("==================================================")
    print("   AASHRAY FULL SYSTEM & ENDPOINT VERIFICATION")
    print("==================================================")

    # 1. Test Backend Endpoints (Port 8010)
    backend_base = "http://127.0.0.1:8010/api"
    backend_endpoints = [
        ("/health", "GET", None),
        ("/dashboard", "GET", None),
        ("/habitations", "GET", None),
        ("/habitations/HAB-001", "GET", None),
        ("/risk-map", "GET", None),
        ("/hazards", "GET", None),
        ("/relocation-sites", "GET", None),
        ("/relocation-sites/SITE-001", "GET", None),
        ("/calculate-risk", "POST", {"habitation_id": "HAB-001", "rainfall_multiplier": 1.5}),
        ("/relocation-plan", "POST", {"habitation_id": "HAB-001"}),
        ("/capacity", "GET", None),
        ("/alerts", "GET", None),
        ("/simulate/extreme-rainfall", "POST", {"rainfall_multiplier": 2.5}),
        ("/simulate/reset", "POST", None),
        ("/data-sources", "GET", None),
        ("/data-sources/status", "GET", None),
        ("/location/assess", "POST", {"latitude": 30.4852, "longitude": 79.6914}),
        ("/location/resolve", "POST", {"latitude": 30.4852, "longitude": 79.6914}),
        ("/location/relocation-options", "POST", {"latitude": 30.4852, "longitude": 79.6914, "population_to_relocate": 1250}),
        ("/field-reports", "GET", None),
        ("/audit-logs", "GET", None),
    ]

    print("\n--- BACKEND ENDPOINTS CHECK ---")
    for endpoint, method, payload in backend_endpoints:
        url = f"{backend_base}{endpoint}"
        if method == "GET":
            r = httpx.get(url)
        else:
            r = httpx.post(url, json=payload or {})
        status = r.status_code
        print(f"[{method}] {endpoint:<30} -> Status: {status}")
        assert status == 200, f"Backend endpoint {endpoint} failed with status {status}"

    # 2. Test Frontend Routes (served on port 5173 with SPA fallback to index.html)
    frontend_base = "http://127.0.0.1:5173"
    frontend_routes = [
        "/",
        "/gis-map",
        "/relocation-planner",
        "/capacity-matrix",
        "/simulation",
        "/field-mode",
        "/alerts",
        "/data-sources",
        "/audit-logs",
        "/settings",
        "/reports",
        "/ai-insights",
    ]

    print("\n--- FRONTEND SPA ROUTES CHECK ---")
    for route in frontend_routes:
        url = f"{frontend_base}{route}"
        r = httpx.get(url)
        status = r.status_code
        has_app = "<div id=\"root\">" in r.text or "AASHRAY" in r.text
        print(f"[GET] {route:<30} -> Status: {status} | SPA HTML Root: {has_app}")
        assert status == 200, f"Frontend route {route} failed with status {status}"
        assert has_app, f"Frontend route {route} did not render HTML root"

    print("\n==================================================")
    print("ALL BACKEND & FRONTEND ENDPOINTS OPERATIONAL (100%)!")
    print("==================================================")

if __name__ == "__main__":
    test_full_system()
