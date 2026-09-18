import httpx
import re

def verify_gis():
    print("==================================================")
    print("  VERIFYING GIS MAP & BASEMAP CONFIGURATION")
    print("==================================================")

    # 1. Fetch Frontend /gis-map HTML
    r_fe = httpx.get("http://127.0.0.1:5173/gis-map")
    print(f"1. GET http://127.0.0.1:5173/gis-map: Status {r_fe.status_code}")
    assert r_fe.status_code == 200, "Frontend GIS route failed"

    # 2. Check Backend /api/risk-map
    r_api = httpx.get("http://127.0.0.1:8010/api/risk-map")
    print(f"2. GET http://127.0.0.1:8010/api/risk-map: Status {r_api.status_code}")
    assert r_api.status_code == 200, "Backend risk-map endpoint failed"

    data = r_api.json()
    hab_count = len(data.get("habitations", {}).get("features", []))
    site_count = len(data.get("candidate_sites", {}).get("features", []))
    redzone_count = len(data.get("red_zones", {}).get("features", []))
    river_count = len(data.get("rivers", {}).get("features", []))
    road_count = len(data.get("roads", {}).get("features", []))
    infra = data.get("infrastructure", {})

    print(f"   - Habitations: {hab_count}")
    print(f"   - Relocation Sites: {site_count}")
    print(f"   - Red Zones: {redzone_count}")
    print(f"   - Rivers: {river_count}")
    print(f"   - Roads: {road_count}")
    print(f"   - Hospitals: {len(infra.get('hospitals', []))}")
    print(f"   - Schools: {len(infra.get('schools', []))}")
    print(f"   - Emergency Hubs: {len(infra.get('emergency_centres', []))}")

    assert hab_count > 0, "No habitations found"
    assert site_count > 0, "No candidate sites found"
    assert redzone_count > 0, "No red zones found"

    # 3. Test OpenStreetMap Tile Server directly
    osm_tile_url = "https://tile.openstreetmap.org/10/737/377.png"
    r_tile = httpx.get(osm_tile_url, headers={"User-Agent": "AASHRAY-GIS-Verification/1.0"})
    print(f"3. OpenStreetMap Tile Fetch ({osm_tile_url}): Status {r_tile.status_code} | Content-Type: {r_tile.headers.get('content-type')}")
    assert r_tile.status_code == 200, "OSM tile server unreachable"
    assert "image" in r_tile.headers.get("content-type", ""), "Tile is not an image"

    # 4. Check Raini Village detail & relocation plan workflow
    r_hab = httpx.get("http://127.0.0.1:8010/api/habitations/HAB-001")
    hab_detail = r_hab.json()
    print(f"4. Selected Habitation (Raini Village): Risk {hab_detail['risk_score']}/100 | Priority: {hab_detail['relocation_priority']}")
    print(f"   Factors: {len(hab_detail['factors'])} factor contributions verified")
    assert hab_detail["name"] == "Raini Village (Reni)"
    assert "factors" in hab_detail and len(hab_detail["factors"]) > 0

    print("==================================================")
    print("GIS MAP BASEMAP VERIFICATION COMPLETE & SUCCESSFUL!")
    print("==================================================")

if __name__ == "__main__":
    verify_gis()
