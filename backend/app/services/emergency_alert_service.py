import math
import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from app.data_providers.geocoding_provider import is_within_india_bounding_box, reverse_geocode
from app.services.risk_service import calculate_location_risk_assessment
from app.services.relocation_service import find_location_relocation_options
from app.services.push_service import send_web_push_notification, get_all_push_subscriptions

logger = logging.getLogger("aashray.emergency_alert")

# Configurable Parameters (Section 5, 7, 17)
MAX_ACCURACY_THRESHOLD_M = 200.0  # Poor GPS accuracy radius threshold
HYSTERESIS_CONSECUTIVE_CHECKS = 2  # Must persist for N checks before push (unless authoritative)
ALERT_COOLDOWN_SECONDS = 900  # 15 minutes duplicate suppression window
MAX_HAZARD_DATA_AGE_HOURS = 12.0  # Stale data threshold

# In-memory tracking for Hysteresis, Duplicate Suppression, and Audit Logs
_USER_CHECK_HISTORY: Dict[str, List[Dict[str, Any]]] = {}
_USER_ALERT_COOLDOWN: Dict[str, Dict[str, Any]] = {}
_ALERT_AUDIT_LOGS: List[Dict[str, Any]] = []

def get_alert_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves recent emergency alert audit logs."""
    return sorted(_ALERT_AUDIT_LOGS, key=lambda x: x.get("sent_at", ""), reverse=True)[:limit]

def evaluate_location_emergency_risk(
    latitude: float,
    longitude: float,
    accuracy_m: float = 20.0,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Core Alert Decision Engine.
    Evaluates supplied GPS coordinates against active hazard data, enforces accuracy filtering,
    applies hysteresis & duplicate suppression, triggers Web Push for HIGH/CRITICAL, and logs audit records.
    """
    anon_user = user_id or "ANON_USER"
    now_ts = time.time()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Geographic Boundary Validation (Section 4)
    if not is_within_india_bounding_box(latitude, longitude):
        return {
            "alert_required": False,
            "risk_level": "LOW",
            "relocation_required": False,
            "hazard_type": "NONE",
            "risk_score": 0,
            "distance_to_high_risk_zone_m": 99999,
            "reason": "Location coordinates lie outside Indian national territory.",
            "notification_sent": False,
            "status": "OUTSIDE_INDIA_BOUNDS"
        }

    # 2. GPS Accuracy Validation (Section 2, 7)
    poor_accuracy = accuracy_m > MAX_ACCURACY_THRESHOLD_M

    # 3. Hazard Assessment Evaluation (Section 4, 16)
    risk_assessment = calculate_location_risk_assessment(latitude, longitude)
    risk_score = risk_assessment.get("risk_score") if risk_assessment.get("risk_score") is not None else risk_assessment.get("composite_risk_score", 0)
    risk_level = str(risk_assessment.get("risk_level") or risk_assessment.get("risk_category") or "LOW").upper()
    hazard_type = str(risk_assessment.get("dominant_hazard") or risk_assessment.get("primary_hazard_type") or "FLOOD").upper()

    data_age_hours = risk_assessment.get("data_age_hours", 0.5)
    last_update = risk_assessment.get("last_data_update", now_iso)
    provider_name = risk_assessment.get("data_provider", "NDMA_CWC_INCOIS_LIVE_GIS")

    # 4. Stale Data Protection (Section 17)
    if data_age_hours > MAX_HAZARD_DATA_AGE_HOURS:
        logger.warning(f"Hazard data is stale ({data_age_hours:.1f} hours old). Emergency claim suppressed.")
        return {
            "alert_required": False,
            "risk_level": risk_level,
            "relocation_required": False,
            "hazard_type": hazard_type,
            "risk_score": risk_score,
            "distance_to_high_risk_zone_m": 99999,
            "reason": f"Hazard data provider timestamp ({last_update}) exceeds max age limit ({MAX_HAZARD_DATA_AGE_HOURS}h).",
            "notification_sent": False,
            "alert_status": "DATA_STALE",
            "data_provenance": {
                "provider": provider_name,
                "data_age_hours": data_age_hours,
                "last_data_update": last_update
            }
        }

    # Standardize risk level mapping
    if risk_score >= 80:
        calculated_level = "CRITICAL"
    elif risk_score >= 60:
        calculated_level = "HIGH"
    elif risk_score >= 35:
        calculated_level = "MODERATE"
    else:
        calculated_level = "LOW"

    # Use higher severity if hazard engine flagged critical
    if risk_level == "CRITICAL":
        calculated_level = "CRITICAL"

    distance_to_high_risk_zone_m = 0 if calculated_level in ["HIGH", "CRITICAL"] else 1500

    # 5. Hysteresis & Persistence Check (Section 7)
    user_history = _USER_CHECK_HISTORY.get(anon_user, [])
    user_history.append({"timestamp": now_ts, "risk_level": calculated_level, "accuracy_m": accuracy_m})
    _USER_CHECK_HISTORY[anon_user] = user_history[-10:]  # keep last 10 checks

    recent_high_critical_checks = [c for c in user_history[-HYSTERESIS_CONSECUTIVE_CHECKS:] if c["risk_level"] in ["HIGH", "CRITICAL"]]
    hysteresis_passed = len(recent_high_critical_checks) >= HYSTERESIS_CONSECUTIVE_CHECKS or calculated_level == "CRITICAL"

    relocation_required = calculated_level in ["HIGH", "CRITICAL"]
    alert_required = (calculated_level in ["HIGH", "CRITICAL"]) and hysteresis_passed and (not poor_accuracy)

    # 6. Relocation Integration (Section 13)
    relocation_plan = None
    recommended_site_name = None
    distance_km_str = None
    direction_str = None
    candidate_verification_status = None

    if relocation_required:
        relocation_plan = find_location_relocation_options(latitude, longitude, population_to_relocate=100)
        rec_site = relocation_plan.get("recommended_site")
        if rec_site:
            recommended_site_name = rec_site.get("name")
            dist_km = rec_site.get("distance_km", 0.0)
            distance_km_str = f"{dist_km:.1f} km"
            direction_str = rec_site.get("compass_direction", "N/A")
            cand_origin = rec_site.get("candidate_origin", "ESTIMATED_RELOCATION_ZONE")
            
            # Honest Verification Labeling (Section 14)
            if rec_site.get("verification_status") == "FIELD_VERIFIED" or cand_origin in ["STATIC_SDMA", "CACHED_GIS"]:
                candidate_verification_status = "Government-verified relief shelter"
            else:
                candidate_verification_status = "Potential safer relocation location identified. Field verification may be required."

    # 7. Duplicate Suppression & Cooldown (Section 7)
    cooldown_key = f"{anon_user}_{hazard_type}"
    last_alert = _USER_ALERT_COOLDOWN.get(cooldown_key)
    in_cooldown = False

    if last_alert:
        time_since_last = now_ts - last_alert.get("sent_at_ts", 0)
        same_level = last_alert.get("risk_level") == calculated_level
        if time_since_last < ALERT_COOLDOWN_SECONDS and same_level:
            in_cooldown = True

    notification_sent = False
    alert_id = f"ALERT-{uuid.uuid4().hex[:8].upper()}"

    # 8. Web Push Notification Dispatch (Section 8, 10, 11)
    if alert_required and not in_cooldown:
        title = "🚨 KSHEMA CRITICAL ALERT" if calculated_level == "CRITICAL" else "⚠️ KSHEMA Safety Alert"
        
        if calculated_level == "CRITICAL":
            body = f"Critical {hazard_type.lower()} risk detected near your location."
            if distance_km_str:
                body += f" A potential safer location is identified ~{distance_km_str} away ({direction_str}). Open KSHEMA for details."
            else:
                body += " Relocation may be required. Open KSHEMA for your safety plan."
        else:
            body = f"High {hazard_type.lower()} risk detected near your current location. Please check recommended safety instructions."

        push_payload = {
            "title": title,
            "body": body,
            "icon": "/favicon.svg",
            "badge": "/favicon.svg",
            "tag": f"kshema-alert-{hazard_type.lower()}",
            "data": {
                "alert_id": alert_id,
                "risk_level": calculated_level,
                "hazard_type": hazard_type,
                "latitude": latitude,
                "longitude": longitude,
                "url": "/?view=safety-plan",
                "relocation_site": recommended_site_name,
                "distance_km": distance_km_str,
                "direction": direction_str,
                "verification_status": candidate_verification_status
            },
            "actions": [
                {"action": "view_safety_plan", "title": "View Safety Plan"}
            ]
        }

        # Send Web Push to all active subscriptions
        subscriptions = get_all_push_subscriptions()
        for sub in subscriptions:
            success = send_web_push_notification(sub["subscription"], push_payload)
            if success:
                notification_sent = True

        # Update cooldown state
        _USER_ALERT_COOLDOWN[cooldown_key] = {
            "alert_id": alert_id,
            "risk_level": calculated_level,
            "hazard_type": hazard_type,
            "sent_at_ts": now_ts
        }

        # Audit Logging (Section 18)
        audit_entry = {
            "alert_id": alert_id,
            "risk_level": calculated_level,
            "hazard_type": hazard_type,
            "latitude": latitude,
            "longitude": longitude,
            "risk_score": risk_score,
            "trigger_reason": f"User location intersects modeled {calculated_level} {hazard_type} zone.",
            "notification_sent": notification_sent,
            "sent_at": now_iso,
            "data_source": provider_name,
            "data_timestamp": last_update,
            "accuracy_m": accuracy_m
        }
        _ALERT_AUDIT_LOGS.append(audit_entry)

    # 9. Format Final Response (Section 6)
    reason_str = f"User location intersects modeled {calculated_level} {hazard_type} zone."
    if poor_accuracy:
        reason_str += f" GPS accuracy ({accuracy_m:.1f}m) exceeds threshold ({MAX_ACCURACY_THRESHOLD_M}m); push notification suppressed for safety."
    elif in_cooldown:
        reason_str += f" Alert active (cooldown window active for duplicate suppression)."
    elif not hysteresis_passed:
        reason_str += f" Awaiting persistence confirmation check ({len(recent_high_critical_checks)}/{HYSTERESIS_CONSECUTIVE_CHECKS})."

    return {
        "alert_required": alert_required,
        "risk_level": calculated_level,
        "relocation_required": relocation_required,
        "hazard_type": hazard_type,
        "risk_score": risk_score,
        "distance_to_high_risk_zone_m": distance_to_high_risk_zone_m,
        "reason": reason_str,
        "relocation_plan": relocation_plan,
        "recommended_site_name": recommended_site_name,
        "distance_km_str": distance_km_str,
        "direction_str": direction_str,
        "verification_status_label": candidate_verification_status,
        "notification_sent": notification_sent,
        "alert_id": alert_id,
        "data_provenance": {
            "provider": provider_name,
            "data_age_hours": data_age_hours,
            "last_data_update": last_update
        },
        "gps_quality": {
            "accuracy_m": accuracy_m,
            "is_poor_accuracy": poor_accuracy
        }
    }

def simulate_demo_alert(
    hazard_type: str = "FLOOD",
    risk_level: str = "CRITICAL",
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Developer Emergency Alert Simulator (Section 21).
    Simulates a HIGH/CRITICAL alert with explicit DEMO tags and triggers real Web Push notifications.
    """
    hazard_type = hazard_type.upper()
    risk_level = risk_level.upper()
    alert_id = f"DEMO-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    title = f"🚨 [DEMO ALERT] KSHEMA CRITICAL ALERT" if risk_level == "CRITICAL" else f"⚠️ [DEMO ALERT] KSHEMA Safety Alert"
    body = f"[DEMO ALERT — NOT A REAL EMERGENCY] Simulated {risk_level} {hazard_type} warning near your position. Open KSHEMA to verify notification flow."

    payload = {
        "title": title,
        "body": body,
        "icon": "/favicon.svg",
        "badge": "/favicon.svg",
        "tag": "kshema-demo-alert",
        "data": {
            "alert_id": alert_id,
            "risk_level": risk_level,
            "hazard_type": hazard_type,
            "is_demo": True,
            "url": "/?view=safety-plan"
        },
        "actions": [
            {"action": "view_safety_plan", "title": "View Safety Plan"}
        ]
    }

    subscriptions = get_all_push_subscriptions()
    sent_count = 0
    for sub in subscriptions:
        if send_web_push_notification(sub["subscription"], payload):
            sent_count += 1

    audit_entry = {
        "alert_id": alert_id,
        "risk_level": risk_level,
        "hazard_type": hazard_type,
        "latitude": 17.3850,
        "longitude": 78.4867,
        "risk_score": 95 if risk_level == "CRITICAL" else 75,
        "trigger_reason": "DEMO ALERT SIMULATOR TRIGGERED BY DEVELOPER",
        "notification_sent": sent_count > 0,
        "sent_at": now_iso,
        "data_source": "KSHEMA_DEMO_SIMULATOR",
        "data_timestamp": now_iso,
        "is_demo": True
    }
    _ALERT_AUDIT_LOGS.append(audit_entry)

    return {
        "status": "DEMO_ALERT_SENT",
        "alert_id": alert_id,
        "hazard_type": hazard_type,
        "risk_level": risk_level,
        "subscriptions_notified": sent_count,
        "total_active_subscriptions": len(subscriptions),
        "audit_recorded": True
    }
