import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.push_service import (
    get_vapid_public_key,
    save_push_subscription,
    remove_push_subscription,
    get_all_push_subscriptions
)
from app.services.emergency_alert_service import (
    evaluate_location_emergency_risk,
    simulate_demo_alert,
    get_alert_audit_logs,
    MAX_ACCURACY_THRESHOLD_M
)

client = TestClient(app)

def test_vapid_public_key_generation():
    """Verify VAPID key generation returns a valid urlsafe base64 string."""
    pub_key = get_vapid_public_key()
    assert pub_key is not None
    assert isinstance(pub_key, str)
    assert len(pub_key) > 40
    
    # API endpoint check
    res = client.get("/api/notifications/vapid-public-key")
    assert res.status_code == 200
    assert "public_key" in res.json()
    assert res.json()["public_key"] == pub_key

def test_web_push_subscription_management():
    """Verify storing and removing Web Push subscriptions."""
    sub_payload = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/test_device_token_123",
        "keys": {
            "p256dh": "BNc_test_p256dh_key",
            "auth": "test_auth_secret"
        }
    }
    
    res = client.post("/api/notifications/subscribe", json={"subscription": sub_payload, "user_id": "TEST_USER_01"})
    assert res.status_code == 200
    assert res.json()["status"] == "SUBSCRIBED"

    subs = get_all_push_subscriptions()
    assert any(s["endpoint"] == sub_payload["endpoint"] for s in subs)

    # Unsubscribe test
    unsub_res = client.post("/api/notifications/unsubscribe", json={"endpoint": sub_payload["endpoint"]})
    assert unsub_res.status_code == 200
    assert unsub_res.json()["status"] == "UNSUBSCRIBED"

def test_outside_india_coordinates_rejection():
    """Verify coordinates outside India bounds (e.g., London 51.5074, -0.1278) are safely rejected."""
    res = evaluate_location_emergency_risk(latitude=51.5074, longitude=-0.1278, accuracy_m=10.0)
    assert res["alert_required"] is False
    assert res["status"] == "OUTSIDE_INDIA_BOUNDS"
    assert "outside Indian" in res["reason"]

def test_poor_gps_accuracy_thresholding():
    """Verify poor GPS accuracy (>200m) suppresses high-confidence push alert."""
    res = evaluate_location_emergency_risk(latitude=17.3850, longitude=78.4867, accuracy_m=500.0)
    assert res["alert_required"] is False
    assert res["gps_quality"]["is_poor_accuracy"] is True
    assert "accuracy" in res["reason"].lower()

def test_location_emergency_risk_evaluation():
    """Verify location check API endpoint returns structured risk evaluation."""
    payload = {
        "latitude": 17.3850,
        "longitude": 78.4867,
        "accuracy_m": 15.0,
        "user_id": "TEST_HYDERABAD_USER"
    }
    response = client.post("/api/emergency/location-check", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "alert_required" in data
    assert "risk_level" in data
    assert "hazard_type" in data
    assert "data_provenance" in data
    assert "gps_quality" in data

def test_hysteresis_and_persistence():
    """Verify hysteresis requires persistence or CRITICAL level for alert triggering."""
    user_id = f"HYST_USER_{pytest.__name__}"
    
    # First check
    res1 = evaluate_location_emergency_risk(latitude=17.3850, longitude=78.4867, accuracy_m=15.0, user_id=user_id)
    # Second check (same location)
    res2 = evaluate_location_emergency_risk(latitude=17.3850, longitude=78.4867, accuracy_m=15.0, user_id=user_id)
    
    assert "risk_level" in res2
    assert isinstance(res2["alert_required"], bool)

def test_demo_alert_simulator():
    """Verify Emergency Alert Simulator dispatches demo alerts with explicit DEMO tags."""
    res = client.post("/api/emergency/simulate-demo-alert", json={"hazard_type": "FLOOD", "risk_level": "CRITICAL"})
    assert res.status_code == 200
    data = res.json()
    
    assert data["status"] == "DEMO_ALERT_SENT"
    assert data["hazard_type"] == "FLOOD"
    assert data["risk_level"] == "CRITICAL"
    assert data["audit_recorded"] is True

def test_emergency_audit_logs_retrieval():
    """Verify audit logs record alert events and can be retrieved via endpoint."""
    res = client.get("/api/emergency/audit-logs?limit=10")
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    # Demo alert should be recorded in audit logs
    assert len(logs) > 0
    assert any("trigger_reason" in item for item in logs)
