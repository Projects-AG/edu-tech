from sqlalchemy.orm import Session

from app.models import Department, Faculty, Institution


DEFAULT_FACULTY_NAME = "General Faculty"
DEFAULT_FACULTY_CODE = "GEN"
DEFAULT_DEPARTMENT_NAME = "General Department"
DEFAULT_DEPARTMENT_CODE = "GEN"


def ensure_default_faculty_and_department(
    db: Session,
    institution: Institution,
):
    faculty = (
        db.query(Faculty)
        .filter(Faculty.institution_id == institution.id)
        .order_by(Faculty.id)
        .first()
    )

    if faculty is None:
        faculty = Faculty(
            institution_id=institution.id,
            name=DEFAULT_FACULTY_NAME,
            code=DEFAULT_FACULTY_CODE,
        )
        db.add(faculty)
        db.flush()

    department = (
        db.query(Department)
        .filter(
            Department.institution_id == institution.id,
            Department.faculty_id == faculty.id,
        )
        .order_by(Department.id)
        .first()
    )

    if department is None:
        department = Department(
            institution_id=institution.id,
            faculty_id=faculty.id,
            name=DEFAULT_DEPARTMENT_NAME,
            code=DEFAULT_DEPARTMENT_CODE,
        )
        db.add(department)
        db.flush()

    return faculty, department
