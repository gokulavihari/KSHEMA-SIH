import httpx

def verify_location_gis():
    print("==================================================")
    print("  AASHRAY GIS RISK RANGE VISUALIZATION TEST")
    print("==================================================")

    # 1. Test Telangana Current Location (17.604161, 78.483843)
    r1 = httpx.post("http://127.0.0.1:8010/api/location/assess", json={
        "latitude": 17.604161,
        "longitude": 78.483843,
        "accuracy": 116.0,
        "source": "GPS"
    })
    print(f"1. Telangana GPS Location Assessment (17.604161, 78.483843): Status {r1.status_code}")
    assert r1.status_code == 200, "Telangana assessment failed"
    data1 = r1.json()
    
    print(f"   - Risk Score: {data1.get('risk_score')}/100 ({data1.get('risk_level')})")
    print(f"   - Vulnerability Score: {data1.get('vulnerability_score')}/100 ({data1.get('vulnerability_level')})")
    print(f"   - Dominant Hazard: {data1.get('dominant_hazard')}")
    print(f"   - Assessment Radius: {data1.get('assessment_radius_m')} m")
    print(f"   - Evidence Coverage: {data1.get('evidence_coverage')}%")
    print(f"   - GPS Accuracy: ±{data1['location']['accuracy_m']} m")
    print(f"   - Assessment Geometry Type: {data1.get('assessment_geometry', {}).get('type')}")
    print(f"   - Hazard Overlaps Count: {len(data1.get('hazard_overlaps', []))}")

    assert data1.get("assessment_radius_m") == 1000.0, "Radius should be data-driven 1000m"
    assert data1.get("assessment_geometry", {}).get("type") == "Polygon", "Geometry should be GeoJSON Polygon"
    assert "dominant_hazard" in data1, "Dominant hazard must be returned"
    assert data1["location"]["accuracy_m"] == 116.0, "Accuracy must match GPS payload"

    # 2. Test Raini Village HAB-001 (30.4852, 79.6914)
    r2 = httpx.post("http://127.0.0.1:8010/api/location/assess", json={
        "latitude": 30.4852,
        "longitude": 79.6914,
        "accuracy": 15.0,
        "source": "MANUAL"
    })
    print(f"2. Raini Village High-Risk Location Assessment (30.4852, 79.6914): Status {r2.status_code}")
    assert r2.status_code == 200, "Raini assessment failed"
    data2 = r2.json()

    print(f"   - Risk Score: {data2.get('risk_score')}/100 ({data2.get('risk_level')})")
    print(f"   - Dominant Hazard: {data2.get('dominant_hazard')}")
    print(f"   - Hazard Overlaps: {[h['name'] for h in data2.get('hazard_overlaps', [])]}")
    
    assert data2.get("risk_level") in ["HIGH", "VERY HIGH", "CRITICAL"], "Raini Village should be high risk"
    assert len(data2.get("hazard_overlaps", [])) > 0, "Hazard overlap should be detected in Raini"

    # 3. Test Out of Coverage Coordinate (0.0, 0.0)
    r3 = httpx.post("http://127.0.0.1:8010/api/location/assess", json={
        "latitude": 0.0,
        "longitude": 0.0
    })
    print(f"3. Out of Coverage Location Assessment (0.0, 0.0): Status {r3.status_code}")
    assert r3.status_code == 200, "Out of coverage request failed"
    data3 = r3.json()
    print(f"   - Assessment Mode: {data3.get('assessment_mode')}")
    print(f"   - Coverage Percentage: {data3.get('coverage_percentage')}%")

    print("==================================================")
    print("LOCATION ASSESSMENT & GIS API VERIFICATION SUCCESSFUL!")
    print("==================================================")

if __name__ == "__main__":
    verify_location_gis()
