from app.db.database import SessionLocal
from app.institution.defaults import (
    ensure_default_faculty_and_department,
)
from app.models import Faculty, Institution


def seed_default_faculties():
    db = SessionLocal()

    try:
        institutions = (
            db.query(Institution)
            .order_by(Institution.id)
            .all()
        )

        created = []
        skipped = []

        for institution in institutions:
            faculty_count = (
                db.query(Faculty)
                .filter(
                    Faculty.institution_id
                    == institution.id
                )
                .count()
            )

            if faculty_count > 0:
                skipped.append(institution.id)
                continue

            faculty, department = (
                ensure_default_faculty_and_department(
                    db,
                    institution,
                )
            )
            created.append(
                (
                    institution.id,
                    faculty.id,
                    department.id,
                )
            )

        db.commit()

        print("Default faculty/department seeding completed.")
        if created:
            print("Created:")
            for institution_id, faculty_id, department_id in created:
                print(
                    f"  institution {institution_id} "
                    f"-> faculty {faculty_id}, "
                    f"department {department_id}"
                )
        else:
            print("Created: none")

        print("Skipped institutions with existing faculties:")
        print(f"  {skipped}")

    except Exception as exc:
        db.rollback()
        print("Error:", exc)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_default_faculties()
