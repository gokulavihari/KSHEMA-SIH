import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import time

from app.main import app
from app.models.user import Base, UserDB, AuditLogDB, SessionLocal
from app.auth.create_admin import seed_default_accounts, create_executive_account
from app.core.security import verify_password, hash_password

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_auth_db():
    """Ensures database is initialized, seeded, and client cookies cleared before test execution."""
    client.cookies.clear()
    seed_default_accounts()

def test_default_seed_executive_accounts():
    """Verify initial executive accounts exist and are hashed with Argon2id."""
    db = SessionLocal()
    try:
        exec_user = db.query(UserDB).filter(UserDB.official_id == "EXEC-01").first()
        assert exec_user is not None
        assert exec_user.role == "EXECUTIVE"
        assert exec_user.password_hash.startswith("$argon2id$")
        assert not exec_user.password_hash.endswith("Aashray@2026!") # Not plaintext!

        admin_user = db.query(UserDB).filter(UserDB.official_id == "ADMIN-01").first()
        assert admin_user is not None
        assert admin_user.role == "ADMIN"
        assert admin_user.password_hash.startswith("$argon2id$")
    finally:
        db.close()

def test_login_success():
    """Valid executive credentials authenticate successfully and return JWT access token."""
    response = client.post(
        "/api/auth/login",
        json={"official_id": "EXEC-01", "password": "Aashray@2026!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["official_id"] == "EXEC-01"
    assert data["user"]["role"] == "EXECUTIVE"
    assert "access_token" in response.cookies or "Bearer" in response.headers.get("set-cookie", "")

def test_login_invalid_password():
    """Incorrect password returns HTTP 401 with generic error message."""
    response = client.post(
        "/api/auth/login",
        json={"official_id": "EXEC-01", "password": "WrongPassword123!"}
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

def test_login_unknown_account():
    """Unknown official ID returns HTTP 401 with generic error message."""
    response = client.post(
        "/api/auth/login",
        json={"official_id": "NON_EXISTENT_OFFICER", "password": "AnyPassword123!"}
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

def test_brute_force_account_lockout():
    """5 consecutive failed login attempts locks account temporarily."""
    create_executive_account("EXEC-LOCKOUT-TEST", "Lockout Officer", "LockoutPass@2026!", "EXECUTIVE")

    for _ in range(5):
        client.post(
            "/api/auth/login",
            json={"official_id": "EXEC-LOCKOUT-TEST", "password": "WrongPassword!"}
        )

    # 6th attempt should return account locked message
    response = client.post(
        "/api/auth/login",
        json={"official_id": "EXEC-LOCKOUT-TEST", "password": "WrongPassword!"}
    )
    assert response.status_code in [401, 403]
    assert "locked" in response.json()["detail"].lower()

def test_public_dashboard_unauthenticated():
    """Anonymous public user can access public dashboard without authentication."""
    response = client.get("/api/public/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["interface"] == "PUBLIC_VIEWER"
    assert "total_monitored_habitations" in data
    assert "active_public_alerts" in data
    assert "habitations_overview" in data
    # Ensure sensitive internal diagnostic models are not exposed
    assert "model_weights" not in data
    assert "database_credentials" not in data

def test_public_map_unauthenticated():
    """Anonymous public user can access public GIS map features."""
    response = client.get("/api/public/map")
    assert response.status_code == 200
    data = response.json()
    assert data["interface"] == "PUBLIC_GIS_MAP"
    assert "features" in data
    assert len(data["features"]) > 0

def test_protected_endpoints_deny_anonymous():
    """Anonymous request to protected backend APIs is rejected with HTTP 401."""
    client.cookies.clear()
    protected_endpoints = [
        ("GET", "/api/auth/me"),
        ("GET", "/api/auth/audit-logs"),
        ("GET", "/api/ml/models"),
        ("POST", "/api/relocation-plan"),
        ("POST", "/api/simulate/extreme-rainfall"),
        ("POST", "/api/config"),
    ]

    for method, endpoint in protected_endpoints:
        if method == "GET":
            res = client.get(endpoint)
        else:
            res = client.post(endpoint, json={})
        assert res.status_code in [401, 403], f"Endpoint {endpoint} allowed anonymous access!"

def test_protected_endpoints_allow_authenticated_executive():
    """Authenticated executive token allows access to protected features."""
    login_res = client.post(
        "/api/auth/login",
        json={"official_id": "EXEC-01", "password": "Aashray@2026!"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Access protected user profile
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["official_id"] == "EXEC-01"

    # Access protected ML models
    ml_res = client.get("/api/ml/models", headers=headers)
    assert ml_res.status_code == 200

    # Access protected simulation
    sim_res = client.post("/api/simulate/extreme-rainfall", json={"rainfall_multiplier": 1.5}, headers=headers)
    assert sim_res.status_code == 200

def test_admin_only_endpoints_deny_regular_executive():
    """Regular executive role is denied access to admin-only endpoints with HTTP 403."""
    login_res = client.post(
        "/api/auth/login",
        json={"official_id": "EXEC-01", "password": "Aashray@2026!"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Config update requires ADMIN role
    config_res = client.post("/api/config", json={"minimum_data_quality_score": 0.85}, headers=headers)
    assert config_res.status_code == 403
    assert "Access denied" in config_res.json()["detail"] or "Required role" in config_res.json()["detail"]

def test_admin_role_allows_admin_endpoints():
    """Admin role permits updating system configuration."""
    login_res = client.post(
        "/api/auth/login",
        json={"official_id": "ADMIN-01", "password": "AdminAashray@2026!"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    config_res = client.post("/api/config", json={"minimum_data_quality_score": 0.80}, headers=headers)
    assert config_res.status_code == 200
    assert config_res.json()["message"] == "System configuration updated successfully"

def test_audit_log_recording():
    """Audit logs record authentication and operational events."""
    db = SessionLocal()
    try:
        logs = db.query(AuditLogDB).filter(AuditLogDB.official_id == "EXEC-01").all()
        assert len(logs) > 0
        latest = logs[-1]
        assert latest.status in ["SUCCESS", "FAILURE", "DENIED"]
        assert latest.action in ["EXECUTIVE_LOGIN_SUCCESS", "EXECUTIVE_LOGIN_FAILURE", "LOGOUT"]
    finally:
        db.close()

def test_favicon_endpoint():
    """Favicon endpoint returns 204 No Content to avoid 404 logs in browsers."""
    response = client.get("/favicon.ico")
    assert response.status_code == 204

