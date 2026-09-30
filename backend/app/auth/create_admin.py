import argparse
import getpass
import sys
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.user import init_db, SessionLocal, UserDB
from app.core.security import hash_password, validate_password_strength

def create_executive_account(official_id: str, full_name: str, password: str, role: str = "EXECUTIVE", email: str = None):
    """Creates or updates an executive account with secure Argon2id password hashing."""
    init_db()
    db: Session = SessionLocal()
    try:
        is_valid, msg = validate_password_strength(password)
        if not is_valid:
            print(f"Error: Invalid password strength. {msg}")
            return False

        existing = db.query(UserDB).filter(UserDB.official_id == official_id).first()
        hashed = hash_password(password)

        if existing:
            existing.full_name = full_name
            existing.password_hash = hashed
            existing.role = role
            existing.is_active = True
            existing.failed_login_attempts = 0
            existing.locked_until = None
            existing.updated_at = datetime.utcnow()
            db.commit()
            print(f"Successfully updated account: {official_id} (Role: {role})")
        else:
            new_user = UserDB(
                official_id=official_id,
                full_name=full_name,
                email=email,
                password_hash=hashed,
                role=role,
                is_active=True,
                failed_login_attempts=0,
                created_at=datetime.utcnow()
            )
            db.add(new_user)
            db.commit()
            print(f"Successfully created initial account: {official_id} (Role: {role})")
        return True
    finally:
        db.close()

def seed_default_accounts():
    """Seeds default initial development executive account if DB is empty."""
    init_db()
    db: Session = SessionLocal()
    try:
        count = db.query(UserDB).count()
        if count == 0:
            print("Database has no users. Bootstrapping default initial executive account...")
            create_executive_account(
                official_id="EXEC-01",
                full_name="Commander Official",
                password="Aashray@2026!",
                role="EXECUTIVE",
                email="executive@aashray.gov.in"
            )
            create_executive_account(
                official_id="ADMIN-01",
                full_name="System Administrator",
                password="AdminAashray@2026!",
                role="ADMIN",
                email="admin@aashray.gov.in"
            )
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create/Update AASHRAY Executive Account")
    parser.add_argument("--official-id", type=str, help="Official / Executive ID (e.g., EXEC-101)")
    parser.add_argument("--full-name", type=str, help="Full Name of Officer")
    parser.add_argument("--role", type=str, default="EXECUTIVE", choices=["EXECUTIVE", "ADMIN"], help="Account role")
    parser.add_argument("--email", type=str, help="Official Email Address")
    args = parser.parse_args()

    official_id = args.official_id or input("Official / Executive ID: ").strip()
    full_name = args.full_name or input("Full Name: ").strip()
    role = args.role

    while True:
        password = getpass.getpass("Password: ")
        confirm = getpass.getpass("Confirm Password: ")
        if password != confirm:
            print("Error: Passwords do not match. Please try again.")
            continue
        is_valid, msg = validate_password_strength(password)
        if not is_valid:
            print(f"Error: {msg}")
            continue
        break

    create_executive_account(official_id, full_name, password, role, args.email)
