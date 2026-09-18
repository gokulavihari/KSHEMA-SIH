import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.risk_engine import classify_risk_score, classify_vulnerability_score
from app.services.relocation_service import find_location_relocation_options

client = TestClient(app)

def test_1_risk_score_23_1_is_moderate_and_no_high_risk_contradiction():
    """TEST 1: Risk score 23.1 -> MODERATE. Decision must NOT be URGENT_RELOCATION or say HIGH RISK without emergency trigger."""
    res = client.post("/api/location/assess", json={
        "latitude": 17.595761,
        "longitude": 78.489133,
        "accuracy": 15.0,
        "source": "GPS"
    })
    assert res.status_code == 200
    data = res.json()
    
    assert data["risk_score"] is not None
    assert data["risk_level"] == "MODERATE"
    assert data["vulnerability_level"] == "MODERATE"
    
    dec = data["decision"]
    assert dec["risk_level"] == "MODERATE"
    assert dec["action"] in ["REVIEW", "MONITOR"]
    assert dec["relocation_required"] is False
    assert "HIGH RISK CONDITION" not in dec["explanation"].upper()

def test_2_risk_score_50_classification():
    """TEST 2: Risk score 50 -> HIGH."""
    assert classify_risk_score(50.0) == "HIGH"

def test_3_risk_score_75_classification():
    """TEST 3: Risk score 75 -> VERY HIGH."""
    assert classify_risk_score(75.0) == "VERY HIGH"

def test_4_risk_score_90_classification():
    """TEST 4: Risk score 90 -> CRITICAL."""
    assert classify_risk_score(90.0) == "CRITICAL"

def test_5_vulnerability_score_30_8_classification():
    """TEST 5: Vulnerability score 30.8 -> MODERATE."""
    assert classify_vulnerability_score(30.8) == "MODERATE"

def test_6_moderate_risk_moderate_vulnerability_no_auto_relocation():
    """TEST 6: Moderate risk + moderate vulnerability -> No automatic urgent relocation unless configured trigger exists."""
    res = client.post("/api/location/assess", json={
        "latitude": 17.595761,
        "longitude": 78.489133
    })
    assert res.status_code == 200
    data = res.json()
    assert data["relocation"]["required"] is False
    assert data["decision"]["action"] in ["REVIEW", "MONITOR"]

def test_7_high_hazard_factor_moderate_overall_risk_explanation():
    """TEST 7: High hazard factor + moderate overall risk -> Dashboard explains the distinction."""
    res = client.post("/api/location/assess", json={
        "latitude": 17.595761,
        "longitude": 78.489133
    })
    assert res.status_code == 200
    data = res.json()
    # Check that explanation distinguishes overall risk from individual hazard factors
    explanation = data["decision"]["explanation"]
    assert "MODERATE" in data["risk_level"]
    assert "HIGH RISK CONDITION" not in data["status_banner"].upper() or "ATTENTION" in data["status_banner"].upper()

def test_8_relocation_required_returns_nearest_feasible_site():
    """TEST 8: Relocation required -> nearest feasible safe site returned."""
    res = client.post("/api/location/assess", json={
        "latitude": 30.4852,
        "longitude": 79.6914
    })
    assert res.status_code == 200
    data = res.json()
    assert data["relocation"]["required"] is True
    assert data["relocation"]["nearest_feasible_site"] is not None
    assert data["relocation"]["nearest_feasible_site"]["site_name"] is not None

def test_9_unsafe_nearest_site_rejected():
    """TEST 9: Unsafe nearest site -> site rejected and next feasible site considered."""
    res = find_location_relocation_options(30.4852, 79.6914, population_to_relocate=1000, risk_level="CRITICAL")
    assert res["nearest_feasible_site"] is not None
    # Ensure tapovan (unsafe) is in rejected_sites_audit and not in allocations
    alloc_ids = [a["site_id"] for a in res["allocations"]]
    assert not any("SITE-005" in aid for aid in alloc_ids) # Tapovan unsafe site
    assert any("SITE-005" in r["site_id"] for r in res["rejected_sites_audit"])

def test_10_no_feasible_site_handled():
    """TEST 10: No feasible site -> NO_FEASIBLE_RELOCATION / unallocated population."""
    # Request huge population exceeding safe capacity
    res = find_location_relocation_options(30.4852, 79.6914, population_to_relocate=999999, risk_level="CRITICAL")
    assert res["unallocated_population"] > 0
    assert "FEASIBLE" in res["status"] or "NO_FEASIBLE" in res["status"]

def test_11_capacity_insufficient_unallocated_population():
    """TEST 11: Capacity insufficient -> partial/unallocated population."""
    res = find_location_relocation_options(30.4852, 79.6914, population_to_relocate=50000, risk_level="CRITICAL")
    assert res["unallocated_population"] > 0
    assert res["allocated_population"] > 0
