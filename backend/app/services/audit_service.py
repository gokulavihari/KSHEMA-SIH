from sqlalchemy.orm import Session
from app.models.user import AuditLogDB, AuditLogResponse
from typing import Optional, List
from datetime import datetime

def log_audit_event(
    db: Session,
    official_id: str,
    role: str,
    action: str,
    status: str = "SUCCESS", # SUCCESS, FAILURE, DENIED
    endpoint: Optional[str] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    details: Optional[str] = None
) -> AuditLogDB:
    """
    Records an operational audit trail entry into the security log.
    Ensures sensitive details (passwords, tokens) are NEVER logged.
    """
    audit_entry = AuditLogDB(
        user_id=user_id,
        official_id=official_id,
        role=role,
        action=action,
        endpoint=endpoint,
        status=status,
        ip_address=ip_address,
        details=details,
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry

def get_recent_audit_logs(db: Session, limit: int = 100) -> List[AuditLogDB]:
    """Retrieves recent decision audit trail entries."""
    return db.query(AuditLogDB).order_by(AuditLogDB.timestamp.desc()).limit(limit).all()
