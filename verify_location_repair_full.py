import httpx

def verify_all_location_flows():
    print("==================================================")
    print("  AASHRAY FULL LOCATION REPAIR VERIFICATION TEST")
    print("==================================================")

    base_url = "http://127.0.0.1:8010"

    # 1. Health check
    h = httpx.get(f"{base_url}/api/health")
    assert h.status_code == 200, f"Health check failed: {h.status_code}"
    print("✓ Health Check Passed (200 OK)")

    # 2. Search Resolution — Medchal
    r1 = httpx.post(f"{base_url}/api/location/resolve", json={"address": "Medchal"})
    assert r1.status_code == 200, f"Resolve Medchal failed: {r1.status_code}"
    d1 = r1.json()
    print(f"✓ Resolve Medchal: {d1.get('locality')}, {d1.get('district')}, {d1.get('state')} ({d1.get('latitude')}, {d1.get('longitude')})")

    # 3. Search Resolution — Hyderabad
    r2 = httpx.post(f"{base_url}/api/location/resolve", json={"address": "Hyderabad"})
    assert r2.status_code == 200, f"Resolve Hyderabad failed: {r2.status_code}"
    d2 = r2.json()
    print(f"✓ Resolve Hyderabad: {d2.get('locality')}, {d2.get('district')}, {d2.get('state')} ({d2.get('latitude')}, {d2.get('longitude')})")

    # 4. Search Resolution — Raini Village
    r3 = httpx.post(f"{base_url}/api/location/resolve", json={"address": "Raini Village"})
    assert r3.status_code == 200, f"Resolve Raini Village failed: {r3.status_code}"
    d3 = r3.json()
    print(f"✓ Resolve Raini: {d3.get('locality')}, {d3.get('district')}, {d3.get('state')} ({d3.get('latitude')}, {d3.get('longitude')})")

    # 5. Direct Coordinate Assessment — Custom Hyderabad Coordinates (17.385044, 78.486671)
    r4 = httpx.post(f"{base_url}/api/location/assess", json={
        "latitude": 17.385044,
        "longitude": 78.486671,
        "accuracy": 10.0,
        "source": "MANUAL"
    })
    assert r4.status_code == 200, f"Assess custom coords failed: {r4.status_code}"
    d4 = r4.json()
    print(f"✓ Custom Coords Assessment: Risk Score {d4.get('risk_score')}/100 ({d4.get('risk_level')}), Vuln Score {d4.get('vulnerability_score')}/100 ({d4.get('vulnerability_level')})")

    # 6. Relocation Options — Custom Coordinates
    r5 = httpx.post(f"{base_url}/api/location/relocation-options", json={
        "latitude": 17.385044,
        "longitude": 78.486671,
        "population_to_relocate": 1250,
        "risk_level": d4.get('risk_level', 'MODERATE')
    })
    assert r5.status_code == 200, f"Relocation options failed: {r5.status_code}"
    d5 = r5.json()
    print(f"✓ Relocation Options Status: {d5.get('status')}")

    # 7. Validation — Invalid Latitude (95.0)
    r6 = httpx.post(f"{base_url}/api/location/assess", json={
        "latitude": 95.0,
        "longitude": 78.486671
    })
    assert r6.status_code == 422, f"Validation failed to catch invalid latitude: {r6.status_code}"
    print("✓ Validation correctly returned HTTP 422 for out-of-bounds latitude")

    print("==================================================")
    print("ALL FULL LOCATION REPAIR VERIFICATION TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    verify_all_location_flows()
