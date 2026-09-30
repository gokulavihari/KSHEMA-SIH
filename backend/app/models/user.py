from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List
import os

Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    official_id = Column(String(64), unique=True, index=True, nullable=False)
    full_name = Column(String(128), nullable=False)
    email = Column(String(128), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="EXECUTIVE") # PUBLIC, EXECUTIVE, ADMIN
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AuditLogDB(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    official_id = Column(String(64), nullable=False)
    role = Column(String(32), nullable=False)
    action = Column(String(128), nullable=False)
    endpoint = Column(String(255), nullable=True)
    status = Column(String(32), nullable=False) # SUCCESS, FAILURE, DENIED
    ip_address = Column(String(64), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aashray_auth.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)


# Pydantic Schemas
class UserLoginRequest(BaseModel):
    official_id: str = Field(..., description="Official / Executive ID")
    password: str = Field(..., description="Password")

class UserCreateRequest(BaseModel):
    official_id: str = Field(..., min_length=3, max_length=64)
    full_name: str = Field(..., min_length=2, max_length=128)
    email: Optional[str] = None
    password: str = Field(..., min_length=8)
    role: str = Field("EXECUTIVE", description="Role: EXECUTIVE or ADMIN")

class UserResponse(BaseModel):
    id: int
    official_id: str
    full_name: str
    email: Optional[str] = None
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenDataPayload(BaseModel):
    official_id: Optional[str] = None
    role: Optional[str] = None
    sub: Optional[str] = None

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    official_id: str
    role: str
    action: str
    endpoint: Optional[str] = None
    status: str
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
