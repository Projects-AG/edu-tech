from app.db.database import engine, Base, SessionLocal
from app.seed.seed_data import seed_data
from app.seed.role_permissions import seed_role_permissions
from app.models import (
    Role,
    User,
    Institution,
    Department,
    Criterion,
    AccreditationCycle,
    Submission,
    Document,
    Notification
)
from app.auth.security import hash_password


def init_db():
    print("Creating all database tables for EduVerse NAAC System...")
    Base.metadata.create_all(bind=engine)

    print("Seeding roles, permissions, modules...")
    seed_data()

    print("Seeding role-module-permission mappings...")
    seed_role_permissions()

    db = SessionLocal()
    try:
        # Seed default Institution
        inst = db.query(Institution).filter(Institution.code == "EDU01").first()
        if not inst:
            inst = Institution(
                name="EduVerse National University",
                code="EDU01",
                address="100 Academic Way, Education City",
                city="Pune",
                state="Maharashtra",
                pincode="411001",
                institution_type="Autonomous University",
                established_year=1998,
                website="https://eduverse.edu"
            )
            db.add(inst)
            db.commit()
            db.refresh(inst)
            print(f"Created default Institution: {inst.name} (ID: {inst.id})")

        # Seed default Departments
        departments = [
            ("Computer Science & Engineering", "CSE", "Dr. R. Verma"),
            ("Information Technology", "IT", "Dr. A. Kulkarni"),
            ("Electronics & Telecommunication", "ECE", "Dr. S. Mehta"),
            ("Mechanical Engineering", "MECH", "Dr. P. Patil")
        ]
        for name, code, head in departments:
            d_obj = db.query(Department).filter(Department.code == code).first()
            if not d_obj:
                d_obj = Department(
                    institution_id=inst.id,
                    name=name,
                    code=code,
                    head_name=head
                )
                db.add(d_obj)
        db.commit()

        # Seed default Accreditation Cycle
        cycle = db.query(AccreditationCycle).filter(AccreditationCycle.code == "CYCLE_3").first()
        if not cycle:
            cycle = AccreditationCycle(
                institution_id=inst.id,
                name="Cycle 3 Accreditation",
                code="CYCLE_3",
                academic_period="2025-2030",
                status="In Progress",
                description="NAAC Cycle 3 Assessment & Accreditation Preparation"
            )
            db.add(cycle)
            db.commit()
            db.refresh(cycle)
            print(f"Created default Accreditation Cycle: {cycle.name}")

        # Seed default Criteria
        criteria_list = [
            ("C1", "Curricular Aspects", 85.0),
            ("C2", "Teaching-Learning & Evaluation", 68.0),
            ("C3", "Research, Innovations & Extension", 74.0),
            ("C4", "Infrastructure & Learning Resources", 59.0),
            ("C5", "Student Support & Progression", 79.0),
            ("C6", "Governance, Leadership & Management", 65.0),
            ("C7", "Institutional Values & Best Practices", 72.0),
        ]
        for num, title, comp in criteria_list:
            c_obj = db.query(Criterion).filter(Criterion.number == num).first()
            if not c_obj:
                c_obj = Criterion(
                    number=num,
                    title=title,
                    weightage=100,
                    completion_percentage=comp,
                    cycle_id=cycle.id if cycle else None
                )
                db.add(c_obj)
        db.commit()

        # Seed Test User Accounts for ALL 7 Roles
        seed_users = [
            ("Dr. S. Kulkarni", "admin@test.com", "admin123", "Admin"),
            ("Platform Administrator", "admin@university.edu", "password123", "Admin"),
            ("Dr. A. Sharma", "coordinator@university.edu", "password123", "NAAC Coordinator"),
            ("Test NAAC Coordinator", "coordinator@test.com", "Coordinator@123", "NAAC Coordinator"),
            ("Committee Member User", "committee@university.edu", "password123", "Committee Member"),
            ("Prof. R. Verma", "dept.cse@university.edu", "password123", "Dept. Coordinator"),
            ("Dr. S. Nair", "reviewer@accreditation.org", "password123", "Reviewer"),
            ("Dr. M. Patel", "approver@university.edu", "password123", "Data Approver"),
            ("Dr. P. Director", "director@university.edu", "password123", "Principal / Director"),
        ]

        cse_dept = db.query(Department).filter(Department.code == "CSE").first()

        for name, email, raw_pwd, role_name in seed_users:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                print(f"Warning: Role '{role_name}' not found for user {email}")
                continue

            existing_user = db.query(User).filter(User.email == email).first()
            if not existing_user:
                u = User(
                    name=name,
                    email=email,
                    password_hash=hash_password(raw_pwd),
                    role_id=role.id,
                    institution_id=inst.id,
                    department_id=cse_dept.id if role_name == "Dept. Coordinator" and cse_dept else None,
                    is_active=True
                )
                db.add(u)
                print(f"Created seed user: {email} ({role_name})")

        db.commit()
        print("Database initialization & 7-role seeding complete!")
    except Exception as e:
        db.rollback()
        print("Error initializing database:", e)
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
