from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional

from app.models.user import UserDB, UserLoginRequest, UserResponse, TokenResponse, AuditLogResponse
from app.core.security import (
    verify_password, create_access_token, MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MINUTES
)
from app.api.deps import get_db, get_current_user, get_current_executive, extract_token_from_request
from app.services.audit_service import log_audit_event, get_recent_audit_logs

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])

@router.post("/login", response_model=TokenResponse)
def login(
    payload: UserLoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticates Authorized Executive personnel using Argon2id password hashing.
    Enforces brute-force protection and records audit logs.
    """
    official_id = payload.official_id.strip()
    user = db.query(UserDB).filter(UserDB.official_id == official_id).first()

    # Generic authentication error to avoid exposing whether account exists
    generic_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials. Access attempt has been recorded.",
        headers={"WWW-Authenticate": "Bearer"}
    )

    if not user:
        log_audit_event(
            db, official_id=official_id, role="UNKNOWN", action="EXECUTIVE_LOGIN_FAILURE",
            status="FAILURE", endpoint="/api/auth/login", ip_address=request.client.host if request.client else None,
            details="Unknown official ID specified."
        )
        raise generic_error

    if not user.is_active:
        log_audit_event(
            db, official_id=official_id, role=user.role, action="EXECUTIVE_LOGIN_DENIED",
            status="DENIED", endpoint="/api/auth/login", ip_address=request.client.host if request.client else None,
            details="Attempted login on deactivated user account."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact system administrator."
        )

    # Check account lockout status
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining_mins = int((user.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
        log_audit_event(
            db, official_id=official_id, role=user.role, action="EXECUTIVE_LOGIN_LOCKED",
            status="DENIED", endpoint="/api/auth/login", ip_address=request.client.host if request.client else None,
            details=f"Login attempt while account locked for {remaining_mins} more minutes."
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Account is temporarily locked due to multiple failed login attempts. Try again in {remaining_mins} minutes."
        )

    # Verify password hash
    if not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            log_audit_event(
                db, official_id=official_id, role=user.role, action="ACCOUNT_LOCKOUT_TRIGGERED",
                status="DENIED", endpoint="/api/auth/login", ip_address=request.client.host if request.client else None,
                details=f"Locked after {MAX_FAILED_ATTEMPTS} consecutive failed login attempts."
            )
        else:
            log_audit_event(
                db, official_id=official_id, role=user.role, action="EXECUTIVE_LOGIN_FAILURE",
                status="FAILURE", endpoint="/api/auth/login", ip_address=request.client.host if request.client else None,
                details=f"Incorrect password ({user.failed_login_attempts}/{MAX_FAILED_ATTEMPTS} attempts)."
            )
        db.commit()
        raise generic_error

    # Password correct -> Reset failed attempts and update last login timestamp
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()

    # Generate JWT token payload
    token_data = {
        "sub": user.official_id,
        "official_id": user.official_id,
        "role": user.role,
        "full_name": user.full_name
    }
    access_token = create_access_token(token_data)

    # Set secure HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        samesite="lax",
        secure=False # Set to True in HTTPS production environments
    )

    log_audit_event(
        db, official_id=user.official_id, role=user.role, action="EXECUTIVE_LOGIN_SUCCESS",
        status="SUCCESS", endpoint="/api/auth/login", user_id=user.id,
        ip_address=request.client.host if request.client else None,
        details="Authorized executive authentication successful."
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )

@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[UserDB] = Depends(get_current_user)
):
    """Invalidates session cookie and records logout audit log."""
    response.delete_cookie("access_token")
    if current_user:
        log_audit_event(
            db, official_id=current_user.official_id, role=current_user.role, action="LOGOUT",
            status="SUCCESS", endpoint="/api/auth/logout", user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            details="User logged out of Authorized Executive Console."
        )
    return {"message": "Logged out successfully", "status": "SUCCESS"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserDB = Depends(get_current_user)):
    """Retrieves current authenticated executive user profile."""
    return UserResponse.from_orm(current_user)

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def fetch_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_executive)
):
    """Retrieves decision audit logs. Authorized Executives only."""
    logs = get_recent_audit_logs(db, limit=limit)
    return [AuditLogResponse.from_orm(l) for l in logs]
