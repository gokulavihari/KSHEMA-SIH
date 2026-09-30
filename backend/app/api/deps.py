from fastapi import Depends, HTTPException, status, Request, Cookie
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Generator, Optional, List
from datetime import datetime

from app.models.user import SessionLocal, UserDB, init_db
from app.core.security import decode_access_token

# Initialize database schema on module load
init_db()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_db() -> Generator[Session, None, None]:
    """Provides database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def extract_token_from_request(request: Request, bearer_token: Optional[str] = Depends(oauth2_scheme)) -> Optional[str]:
    """Extracts JWT token from Authorization header or HttpOnly cookie."""
    if bearer_token:
        return bearer_token
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        if cookie_token.startswith("Bearer "):
            return cookie_token[7:]
        return cookie_token
    return None

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(extract_token_from_request)
) -> UserDB:
    """
    Validates JWT token and retrieves current authenticated user.
    Throws 401 Unauthorized if missing, invalid, expired, or inactive.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided. Authorized Executive login required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    official_id: str = payload.get("sub") or payload.get("official_id")
    if not official_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload structure.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(UserDB).filter(UserDB.official_id == official_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact system administrator.",
        )
    
    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is temporarily locked due to multiple failed login attempts until {user.locked_until.strftime('%H:%M:%S UTC')}.",
        )

    return user

def get_optional_user(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(extract_token_from_request)
) -> Optional[UserDB]:
    """Attempts to retrieve current user if token is present, returning None for anonymous users."""
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    official_id = payload.get("sub") or payload.get("official_id")
    if not official_id:
        return None
    user = db.query(UserDB).filter(UserDB.official_id == official_id, UserDB.is_active == True).first()
    return user

def require_roles(allowed_roles: List[str]):
    """Returns a dependency checking if current user has any of the specified roles."""
    def role_checker(user: UserDB = Depends(get_current_user)) -> UserDB:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: one of {allowed_roles}. Your role: '{user.role}'.",
            )
        return user
    return role_checker

# Helper dependencies for role enforcement
get_current_executive = require_roles(["EXECUTIVE", "ADMIN"])
get_current_admin = require_roles(["ADMIN"])
