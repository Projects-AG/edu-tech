from app.db.database import SessionLocal
from app.models import User, Role
from app.auth.security import hash_password


db = SessionLocal()

try:
    # Find NAAC Coordinator role
    role = db.query(Role).filter(
        Role.name == "NAAC Coordinator"
    ).first()

    if not role:
        print("ERROR: NAAC Coordinator role not found in database.")
    else:
        print("NAAC Coordinator role found.")
        print("Role ID:", role.id)

        # Check whether user already exists
        existing_user = db.query(User).filter(
            User.email == "coordinator@test.com"
        ).first()

        if existing_user:
            print("User already exists.")
            print("User ID:", existing_user.id)
            print("Current Role ID:", existing_user.role_id)

        else:
            new_user = User(
                name="Test NAAC Coordinator",
                email="coordinator@test.com",
                password_hash=hash_password("Coordinator@123"),
                role_id=role.id,
                institution_id=None,
                department_id=None,
                is_active=True
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            print()
            print("======================================")
            print("NAAC COORDINATOR USER CREATED")
            print("======================================")
            print("User ID:", new_user.id)
            print("Name:", new_user.name)
            print("Email:", new_user.email)
            print("Password: Coordinator@123")
            print("Role:", role.name)
            print("Role ID:", role.id)
            print("======================================")

finally:
    db.close()