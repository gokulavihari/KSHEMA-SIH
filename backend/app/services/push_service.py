import os
import json
import logging
from typing import Dict, Any, List, Optional
from py_vapid import Vapid, b64urlencode
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from pywebpush import webpush, WebPushException

logger = logging.getLogger("aashray.push_service")

# VAPID key storage directory / file
VAPID_PRIVATE_KEY_PATH = os.path.join(os.path.dirname(__file__), "..", "core", "vapid_private.pem")

_VAPID_INSTANCE: Optional[Vapid] = None
_VAPID_PUBLIC_KEY: Optional[str] = None

# In-memory store for Web Push subscriptions keyed by endpoint or user_id
_PUSH_SUBSCRIPTIONS: Dict[str, Dict[str, Any]] = {}

def get_or_create_vapid_keys() -> Vapid:
    """Retrieves or generates persistent VAPID EC keypair for Web Push authentication."""
    global _VAPID_INSTANCE, _VAPID_PUBLIC_KEY
    if _VAPID_INSTANCE is not None:
        return _VAPID_INSTANCE

    os.makedirs(os.path.dirname(VAPID_PRIVATE_KEY_PATH), exist_ok=True)

    if os.path.exists(VAPID_PRIVATE_KEY_PATH):
        try:
            _VAPID_INSTANCE = Vapid.from_file(VAPID_PRIVATE_KEY_PATH)
            pub_bytes = _VAPID_INSTANCE.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
            _VAPID_PUBLIC_KEY = b64urlencode(pub_bytes)
            logger.info("Loaded existing VAPID keypair.")
            return _VAPID_INSTANCE
        except Exception as e:
            logger.warning(f"Failed to load VAPID file, regenerating: {e}")

    vapid = Vapid()
    vapid.generate_keys()
    try:
        vapid.save_key(VAPID_PRIVATE_KEY_PATH)
    except Exception as e:
        logger.warning(f"Could not persist VAPID key file: {e}")
    
    pub_bytes = vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    _VAPID_PUBLIC_KEY = b64urlencode(pub_bytes)
    _VAPID_INSTANCE = vapid
    logger.info("Generated new VAPID keypair.")
    return _VAPID_INSTANCE

def get_vapid_public_key() -> str:
    """Returns urlsafe base64 VAPID public key for browser PushManager subscription."""
    global _VAPID_PUBLIC_KEY
    if not _VAPID_PUBLIC_KEY:
        get_or_create_vapid_keys()
    return _VAPID_PUBLIC_KEY or ""

def save_push_subscription(subscription_data: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    """Stores a browser Web Push subscription securely."""
    endpoint = subscription_data.get("endpoint")
    if not endpoint:
        raise ValueError("Invalid subscription payload: missing endpoint")

    sub_id = user_id or f"sub_{hash(endpoint) & 0xFFFFFFFF}"
    record = {
        "user_id": sub_id,
        "subscription": subscription_data,
        "endpoint": endpoint,
        "created_at": subscription_data.get("timestamp") or "now"
    }
    _PUSH_SUBSCRIPTIONS[endpoint] = record
    logger.info(f"Saved push subscription for user/endpoint {sub_id}")
    return record

def remove_push_subscription(endpoint: str) -> bool:
    """Removes a push subscription by endpoint."""
    if endpoint in _PUSH_SUBSCRIPTIONS:
        del _PUSH_SUBSCRIPTIONS[endpoint]
        return True
    return False

def get_all_push_subscriptions() -> List[Dict[str, Any]]:
    """Returns all registered push subscriptions."""
    return list(_PUSH_SUBSCRIPTIONS.values())

def send_web_push_notification(subscription: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    """Sends encrypted Web Push payload to the subscriber endpoint."""
    vapid = get_or_create_vapid_keys()
    claims = {"sub": "mailto:sih2026@aashray.gov.in"}
    
    payload_str = json.dumps(payload)
    
    try:
        webpush(
            subscription_info=subscription,
            data=payload_str,
            vapid_private_key=VAPID_PRIVATE_KEY_PATH if os.path.exists(VAPID_PRIVATE_KEY_PATH) else vapid,
            vapid_claims=claims,
            timeout=5
        )
        logger.info(f"Web Push sent successfully to endpoint {subscription.get('endpoint', '')[:30]}...")
        return True
    except WebPushException as ex:
        logger.error(f"WebPushException sending push: {ex}")
        # If subscription expired (404/410 Gone), remove it
        if ex.response is not None and ex.response.status_code in [404, 410]:
            remove_push_subscription(subscription.get("endpoint", ""))
        return False
    except Exception as ex:
        logger.error(f"Failed to send Web Push notification: {ex}")
        return False
