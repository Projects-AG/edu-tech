from app.db.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.auth.security import hash_password


users_to_insert = [
    ("Admin", "admin@test.com", "admin123", "Admin"),
    ("NAAC Coordinator", "coordinator@test.com", "Coordinator@123", "NAAC Coordinator"),
    ("Committee Member", "committee@university.edu", "password123", "Committee Member"),
    ("Dept. Coordinator", "dept.cse@university.edu", "password123", "Dept. Coordinator"),
    ("Reviewer", "reviewer@accreditation.org", "password123", "Reviewer"),
    ("Data Approver", "approver@university.edu", "password123", "Data Approver"),
    ("Principal / Director", "director@university.edu", "password123", "Principal / Director"),
]


db = SessionLocal()

try:
    for name, email, password, role_name in users_to_insert:

        # Find role
        role = db.query(Role).filter(Role.name == role_name).first()

        if not role:
            print(f"❌ Role not found: {role_name}")
            continue

        # Check if user already exists
        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:
            print(f"⚠️ User already exists: {email}")
            continue

        # Create user
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role_id=role.id,
            institution_id=None,
            department_id=None,
            is_active=True,
        )

        db.add(user)

        print(f"✅ Created: {email} → {role_name}")

    db.commit()

    print("\n User seeding completed successfully!")

except Exception as e:
    db.rollback()
    print("\n Error:", e)

finally:
    db.close()