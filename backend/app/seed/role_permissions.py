from app.db.database import SessionLocal
from app.models import (
    Role,
    Permission,
    Module,
    RoleModulePermission
)


def get_role(db, name):
    return db.query(Role).filter(
        Role.name == name
    ).first()


def get_permission(db, name):
    return db.query(Permission).filter(
        Permission.name == name
    ).first()


def get_module(db, code):
    return db.query(Module).filter(
        Module.code == code
    ).first()


def add_permission(
    db,
    role_name,
    module_code,
    permission_name
):
    role = get_role(db, role_name)
    module = get_module(db, module_code)
    permission = get_permission(db, permission_name)

    if not role or not module or not permission:
        print(
            f"Skipping: "
            f"{role_name} → "
            f"{module_code} → "
            f"{permission_name}"
        )
        return

    existing = db.query(
        RoleModulePermission
    ).filter(
        RoleModulePermission.role_id == role.id,
        RoleModulePermission.module_id == module.id,
        RoleModulePermission.permission_id == permission.id
    ).first()

    if not existing:
        db.add(
            RoleModulePermission(
                role_id=role.id,
                module_id=module.id,
                permission_id=permission.id,
                allowed=True
            )
        )


def seed_role_permissions():

    db = SessionLocal()

    try:

        # ==========================================
        # ADMIN
        # ==========================================

        admin_modules = [
            "DASHBOARD",
            "FORMS_DATA",
            "EVIDENCE",
            "CRITERIA_1",
            "CRITERIA_2",
            "CRITERIA_3",
            "CRITERIA_4",
            "CRITERIA_5",
            "CRITERIA_6",
            "CRITERIA_7",
            "SSR",
            "AQAR",
            "REPORTS",
            "ANALYTICS",
            "ACCREDITATION_CYCLES",
            "USER_MANAGEMENT",
            "INSTITUTION_MANAGEMENT"
        ]

        admin_permissions = [
            "View",
            "Create",
            "Edit",
            "Delete",
            "Upload",
            "Review",
            "Submit",
            "Approve"
        ]

        for module in admin_modules:
            for permission in admin_permissions:
                add_permission(
                    db,
                    "Admin",
                    module,
                    permission
                )

        # ==========================================
        # COORDINATOR
        # ==========================================

        coordinator_modules = [
            "DASHBOARD",
            "FORMS_DATA",
            "EVIDENCE",
            "CRITERIA_1",
            "CRITERIA_2",
            "CRITERIA_3",
            "CRITERIA_4",
            "CRITERIA_5",
            "CRITERIA_6",
            "CRITERIA_7",
            "SSR",
            "AQAR",
            "REPORTS",
            "ANALYTICS",
            "ACCREDITATION_CYCLES"
        ]

        coordinator_permissions = [
            "View",
            "Create",
            "Edit",
            "Upload",
            "Review",
            "Submit",
            "Approve"
        ]

        for module in coordinator_modules:
            for permission in coordinator_permissions:
                add_permission(
                    db,
                    "NAAC Coordinator",
                    module,
                    permission
                )

        # Institution Management - Coordinator
        for permission in [
            "View",
            "Create",
            "Edit"
        ]:
            add_permission(
                db,
                "NAAC Coordinator",
                "INSTITUTION_MANAGEMENT",
                permission
            )

        # ==========================================
        # COMMITTEE MEMBER
        # ==========================================

        committee_modules = [
            "DASHBOARD",
            "FORMS_DATA",
            "EVIDENCE",
            "CRITERIA_1",
            "CRITERIA_2",
            "CRITERIA_3",
            "CRITERIA_4",
            "CRITERIA_5",
            "CRITERIA_6",
            "CRITERIA_7",
            "SSR",
            "REPORTS"
        ]

        # Cleanup any existing write/submit permissions for Committee Member
        committee_role = get_role(db, "Committee Member")
        if committee_role:
            unwanted_perms = db.query(Permission).filter(
                Permission.name.in_(["Create", "Edit", "Upload", "Submit", "Delete", "Approve"])
            ).all()
            unwanted_ids = [p.id for p in unwanted_perms]
            db.query(RoleModulePermission).filter(
                RoleModulePermission.role_id == committee_role.id,
                RoleModulePermission.permission_id.in_(unwanted_ids)
            ).delete(synchronize_session=False)
            db.commit()

        committee_permissions = [
            "View",
            "Review"
        ]

        for module in committee_modules:
            for permission in committee_permissions:
                add_permission(
                    db,
                    "Committee Member",
                    module,
                    permission
                )

        add_permission(
            db,
            "Committee Member",
            "INSTITUTION_MANAGEMENT",
            "View"
        )

        # ==========================================
        # DEPARTMENT COORDINATOR
        # ==========================================

        dept_modules = [
            "DASHBOARD",
            "FORMS_DATA",
            "EVIDENCE",
            "CRITERIA_1",
            "CRITERIA_2",
            "CRITERIA_3",
            "CRITERIA_4",
            "CRITERIA_5",
            "CRITERIA_6",
            "CRITERIA_7",
            "REPORTS"
        ]

        dept_permissions = [
            "View",
            "Create",
            "Edit",
            "Upload",
            "Submit"
        ]

        for module in dept_modules:
            for permission in dept_permissions:
                add_permission(
                    db,
                    "Dept. Coordinator",
                    module,
                    permission
                )

        add_permission(
            db,
            "Dept. Coordinator",
            "INSTITUTION_MANAGEMENT",
            "View"
        )

        # ==========================================
        # REVIEWER
        # ==========================================

        reviewer_modules = [
            "DASHBOARD",
            "EVIDENCE",
            "CRITERIA_1",
            "CRITERIA_2",
            "CRITERIA_3",
            "CRITERIA_4",
            "CRITERIA_5",
            "CRITERIA_6",
            "CRITERIA_7",
            "SSR",
            "REPORTS"
        ]

        reviewer_permissions = [
            "View",
            "Review"
        ]

        for module in reviewer_modules:
            for permission in reviewer_permissions:
                add_permission(
                    db,
                    "Reviewer",
                    module,
                    permission
                )

        add_permission(
            db,
            "Reviewer",
            "INSTITUTION_MANAGEMENT",
            "View"
        )

        # ==========================================
        # DATA APPROVER
        # ==========================================

        approver_modules = [
            "DASHBOARD",
            "FORMS_DATA",
            "EVIDENCE",
            "CRITERIA_1",
            "CRITERIA_2",
            "CRITERIA_3",
            "CRITERIA_4",
            "CRITERIA_5",
            "CRITERIA_6",
            "CRITERIA_7",
            "SSR",
            "AQAR",
            "REPORTS"
        ]

        approver_permissions = [
            "View",
            "Review",
            "Approve"
        ]

        for module in approver_modules:
            for permission in approver_permissions:
                add_permission(
                    db,
                    "Data Approver",
                    module,
                    permission
                )

        add_permission(
            db,
            "Data Approver",
            "INSTITUTION_MANAGEMENT",
            "View"
        )

        # ==========================================
        # PRINCIPAL / DIRECTOR
        # ==========================================

        principal_modules = [
            "DASHBOARD",
            "FORMS_DATA",
            "EVIDENCE",
            "CRITERIA_1",
            "CRITERIA_2",
            "CRITERIA_3",
            "CRITERIA_4",
            "CRITERIA_5",
            "CRITERIA_6",
            "CRITERIA_7",
            "SSR",
            "AQAR",
            "REPORTS",
            "ANALYTICS",
            "ACCREDITATION_CYCLES"
        ]

        principal_permissions = [
            "View",
            "Review",
            "Approve"
        ]

        for module in principal_modules:
            for permission in principal_permissions:
                add_permission(
                    db,
                    "Principal / Director",
                    module,
                    permission
                )

        add_permission(
            db,
            "Principal / Director",
            "INSTITUTION_MANAGEMENT",
            "View"
        )

        # ==========================================
        # SAVE
        # ==========================================

        db.commit()

        print(
            "Role-module-permission mapping "
            "created successfully!"
        )

    except Exception as e:
        db.rollback()
        print("Error:", e)

    finally:
        db.close()


if __name__ == "__main__":
    seed_role_permissions()