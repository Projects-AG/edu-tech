from app.db.database import SessionLocal
from app.models import Role, Permission, Module


def seed_data():
    db = SessionLocal()

    try:
        # =====================================================
        # ROLES
        # =====================================================

        roles = [
            (
                "NAAC Coordinator",
                 "Manages overall NAAC accreditation activities"
            ),
            (
                "Committee Member",
                "Participates in NAAC committee activities"
            ),
            (
                "Dept. Coordinator",
                "Manages department-level NAAC activities"
            ),
            (
                "Reviewer",
                "Reviews submitted data and evidence"
            ),
            (
                "Data Approver",
                "Approves verified data and evidence"
            ),
            (
                "Principal / Director",
                "Institution-level approval and monitoring"
            ),
            (
              "Institution Admin",
              "Manages institution profile, departments, users, and role assignments"
            ),
            (
                "Admin",
                "System and user administration"
            ),
        ]

        for name, description in roles:
            existing = db.query(Role).filter(
                Role.name == name
            ).first()

            if not existing:
                db.add(
                    Role(
                        name=name,
                        description=description
                    )
                )

        # =====================================================
        # PERMISSIONS
        # =====================================================

        permissions = [
            ("View", "View module data"),
            ("Create", "Create new data"),
            ("Edit", "Edit existing data"),
            ("Delete", "Delete data"),
            ("Upload", "Upload files or evidence"),
            ("Review", "Review submitted information"),
            ("Submit", "Submit information for approval"),
            ("Approve", "Approve submitted information"),
        ]

        for name, description in permissions:
            existing = db.query(Permission).filter(
                Permission.name == name
            ).first()

            if not existing:
                db.add(
                    Permission(
                        name=name,
                        description=description
                    )
                )

        # =====================================================
        # NAAC MODULES
        # =====================================================

        modules = [
            (
                "Dashboard",
                "DASHBOARD",
                "Role-based dashboard"
            ),
            (
                "Forms & Data Entry",
                "FORMS_DATA",
                "NAAC forms and data entry"
            ),
            (
                "Evidence",
                "EVIDENCE",
                "Evidence and document management"
            ),

            (
                "Criteria 1",
                "CRITERIA_1",
                "NAAC Criterion 1"
            ),
            (
                "Criteria 2",
                "CRITERIA_2",
                "NAAC Criterion 2"
            ),
            (
                "Criteria 3",
                "CRITERIA_3",
                "NAAC Criterion 3"
            ),
            (
                "Criteria 4",
                "CRITERIA_4",
                "NAAC Criterion 4"
            ),
            (
                "Criteria 5",
                "CRITERIA_5",
                "NAAC Criterion 5"
            ),
            (
                "Criteria 6",
                "CRITERIA_6",
                "NAAC Criterion 6"
            ),
            (
                "Criteria 7",
                "CRITERIA_7",
                "NAAC Criterion 7"
            ),

            (
                "SSR",
                "SSR",
                "Self Study Report"
            ),
            (
                "AQAR",
                "AQAR",
                "Annual Quality Assurance Report"
            ),
            (
                "Reports",
                "REPORTS",
                "NAAC reports"
            ),
            (
                "Analytics",
                "ANALYTICS",
                "Performance analytics"
            ),
            (
                "Accreditation Cycles",
                "ACCREDITATION_CYCLES",
                "Accreditation cycle management"
            ),
            (
                "User Management",
                "USER_MANAGEMENT",
                "User and role management"
            ),

            # =================================================
            # NEW MODULE
            # =================================================

            (
                "Institution Management",
                "INSTITUTION_MANAGEMENT",
                "Manage institutions and institutional information"
            ),
        ]

        for name, code, description in modules:
            existing = db.query(Module).filter(
                Module.code == code
            ).first()

            if not existing:
                db.add(
                    Module(
                        name=name,
                        code=code,
                        description=description
                    )
                )

        db.commit()

        print("Seed data inserted successfully!")

    except Exception as e:
        db.rollback()
        print("Error:", e)

    finally:
        db.close()


if __name__ == "__main__":
    seed_data()