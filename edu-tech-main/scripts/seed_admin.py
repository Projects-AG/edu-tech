"""Create the first institution and ADMIN user (idempotent)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.models import Institution, RoleAssignment, RoleName, ScopeType, User  # noqa: E402

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "ChangeMe123!"
ADMIN_NAME = "Platform Admin"
INSTITUTION_NAME = "Default Institution"
INSTITUTION_TYPE = "University"


def seed() -> None:
    db = SessionLocal()
    try:
        institution = db.query(Institution).filter(Institution.name == INSTITUTION_NAME).first()
        if not institution:
            institution = Institution(name=INSTITUTION_NAME, type=INSTITUTION_TYPE)
            db.add(institution)
            db.flush()
            print(f"Created institution '{INSTITUTION_NAME}' ({institution.id})")
        else:
            print(f"Using existing institution '{INSTITUTION_NAME}' ({institution.id})")

        user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not user:
            user = User(
                institution_id=institution.id,
                name=ADMIN_NAME,
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
            )
            db.add(user)
            db.flush()
            print(f"Created ADMIN user {ADMIN_EMAIL}")
        else:
            print(f"ADMIN user {ADMIN_EMAIL} already exists")

        existing_role = (
            db.query(RoleAssignment)
            .filter(
                RoleAssignment.user_id == user.id,
                RoleAssignment.role == RoleName.ADMIN,
            )
            .first()
        )
        if not existing_role:
            db.add(
                RoleAssignment(
                    user_id=user.id,
                    role=RoleName.ADMIN,
                    scope_type=ScopeType.INSTITUTION,
                )
            )
            print("Assigned ADMIN role (INSTITUTION scope)")

        db.commit()
        print("\nLogin with:")
        print(f"  email:    {ADMIN_EMAIL}")
        print(f"  password: {ADMIN_PASSWORD}")
        print("Change this password after first login.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
