"""Seed NAAC Cycle 3 catalog + demo evidence/submissions for IQAC UI testing.

Idempotent. Run after scripts/seed_admin.py.
"""

from __future__ import annotations

import hashlib
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.models import (  # noqa: E402
    AcademicYear,
    AccreditationCycle,
    Criterion,
    CycleStatus,
    Department,
    Evidence,
    EvidenceStatus,
    FileUpload,
    Institution,
    KeyIndicator,
    Metric,
    ReviewAction,
    ReviewStage,
    ReviewStepState,
    RoleAssignment,
    RoleName,
    ScopeType,
    Submission,
    SubmissionEvidence,
    SubmissionStatus,
    User,
)

IQAC_EMAIL = "iqac@example.com"
IQAC_PASSWORD = "ChangeMe123!"
IQAC_NAME = "NAAC Coordinator"

CRITERIA_CATALOG = [
    ("C1", "Curricular Aspects", "Curriculum design and enrichment.", "Academics", "1.1", "Curriculum Design", "1.1.1", "Curricula developed and implemented", 20),
    ("C2", "Teaching-Learning and Evaluation", "Enrolment, teaching and evaluation.", "Academics", "2.2", "Student Diversity", "2.2.1", "Student Attendance data", 20),
    ("C3", "Research, Innovations and Extension", "Research and extension activities.", "Research Cell", "3.4", "Research Publications", "3.4.1", "Scopus Indexed Publications", 15),
    ("C4", "Infrastructure and Learning Resources", "Physical and IT infrastructure.", "Infrastructure", "4.2", "Library Resources", "4.2.2", "Library Usage Statistics", 10),
    ("C5", "Student Support and Progression", "Support, progression and placement.", "Student Affairs", "5.2", "Student Progression", "5.2.1", "Placement Drive Records", 20),
    ("C6", "Governance, Leadership and Management", "Vision, strategy and IQAC.", "IQAC", "6.5", "Internal Quality Assurance", "6.5.1", "IQAC Meeting Minutes", 10),
    ("C7", "Institutional Values and Best Practices", "Values and best practices.", "IQAC", "7.2", "Best Practices", "7.2.1", "Best Practices Documentation", 20),
]

DEFAULT_WORKFLOW = [
    ReviewStage.DRAFT,
    ReviewStage.REVIEWER,
    ReviewStage.COMMITTEE,
    ReviewStage.DATA_APPROVAL,
    ReviewStage.SSR_LOCK,
]


def ensure_iqac(db, institution: Institution) -> User:
    user = db.query(User).filter(User.email == IQAC_EMAIL).first()
    if not user:
        user = User(
            institution_id=institution.id,
            name=IQAC_NAME,
            email=IQAC_EMAIL,
            password_hash=hash_password(IQAC_PASSWORD),
        )
        db.add(user)
        db.flush()
        print(f"Created IQAC user {IQAC_EMAIL}")
    else:
        print(f"Using existing IQAC user {IQAC_EMAIL}")

    existing = (
        db.query(RoleAssignment)
        .filter(
            RoleAssignment.user_id == user.id,
            RoleAssignment.role == RoleName.IQAC_COORDINATOR,
        )
        .first()
    )
    if not existing:
        db.add(
            RoleAssignment(
                user_id=user.id,
                role=RoleName.IQAC_COORDINATOR,
                scope_type=ScopeType.INSTITUTION,
            )
        )
        print("Assigned IQAC_COORDINATOR")
    return user


def ensure_departments(db, institution: Institution) -> list[Department]:
    specs = [
        ("CE", "Computer Engineering"),
        ("IT", "Information Technology"),
        ("ME", "Mechanical Engineering"),
        ("EE", "Electrical Engineering"),
    ]
    result: list[Department] = []
    for code, name in specs:
        dept = (
            db.query(Department)
            .filter(Department.institution_id == institution.id, Department.code == code)
            .first()
        )
        if not dept:
            dept = Department(institution_id=institution.id, code=code, name=name)
            db.add(dept)
            db.flush()
            print(f"Created department {code}")
        result.append(dept)
    return result


def ensure_cycle(db, institution: Institution) -> AccreditationCycle:
    year = (
        db.query(AcademicYear)
        .filter(AcademicYear.institution_id == institution.id, AcademicYear.label == "2026-27")
        .first()
    )
    if not year:
        year = AcademicYear(
            institution_id=institution.id,
            label="2026-27",
            start_date=datetime(2026, 6, 1),
            end_date=datetime(2027, 5, 31),
            is_active=True,
        )
        db.add(year)
        db.flush()
        print("Created academic year 2026-27")

    cycle = (
        db.query(AccreditationCycle)
        .filter(
            AccreditationCycle.institution_id == institution.id,
            AccreditationCycle.title == "CYCLE 3",
        )
        .first()
    )
    if not cycle:
        cycle = AccreditationCycle(
            institution_id=institution.id,
            academic_year_id=year.id,
            title="CYCLE 3",
            label="2026–27",
            status=CycleStatus.SSR_IN_PROGRESS,
            ssr_target_percent=85,
            expected_submission="December 2026",
            is_active=True,
        )
        db.add(cycle)
        db.flush()
        print("Created CYCLE 3")
    return cycle


def ensure_catalog(db, cycle: AccreditationCycle) -> list[Criterion]:
    criteria: list[Criterion] = []
    for idx, row in enumerate(CRITERIA_CATALOG, start=1):
        code, title, desc, lead, ki_code, ki_name, m_code, m_name, weight = row
        criterion = (
            db.query(Criterion)
            .filter(Criterion.cycle_id == cycle.id, Criterion.code == code)
            .first()
        )
        if not criterion:
            criterion = Criterion(
                cycle_id=cycle.id,
                code=code,
                title=title,
                description=desc,
                sort_order=idx,
                lead_label=lead,
            )
            db.add(criterion)
            db.flush()
            ki = KeyIndicator(
                criterion_id=criterion.id,
                code=ki_code,
                name=ki_name,
                sort_order=1,
            )
            db.add(ki)
            db.flush()
            db.add(
                Metric(
                    key_indicator_id=ki.id,
                    code=m_code,
                    name=m_name,
                    weightage=weight,
                    description=m_name,
                    sort_order=1,
                )
            )
            print(f"Seeded {code}")
        criteria.append(criterion)
    db.flush()
    return criteria


def placeholder_file(db, institution_id: str, user_id: str, name: str) -> FileUpload:
    existing = (
        db.query(FileUpload)
        .filter(FileUpload.institution_id == institution_id, FileUpload.file_name == name)
        .first()
    )
    if existing:
        return existing
    content = f"demo:{name}".encode()
    row = FileUpload(
        institution_id=institution_id,
        uploaded_by_id=user_id,
        file_name=name,
        storage_key=f"seed/{name}",
        mime_type="application/pdf",
        size_bytes=max(len(content) * 1024, 2048),
        checksum=hashlib.sha256(content).hexdigest(),
    )
    db.add(row)
    db.flush()
    return row


def init_workflow(db, submission: Submission, current_idx: int) -> None:
    if db.query(ReviewAction).filter(ReviewAction.submission_id == submission.id).count():
        return
    for i, stage in enumerate(DEFAULT_WORKFLOW):
        if i < current_idx:
            state = ReviewStepState.DONE
        elif i == current_idx:
            state = ReviewStepState.CURRENT
        else:
            state = ReviewStepState.PENDING
        db.add(
            ReviewAction(
                submission_id=submission.id,
                stage=stage,
                state=state,
                sort_order=i,
                assigned_to_id=submission.assigned_to_id if i == current_idx else None,
                acted_at=datetime.utcnow() if state == ReviewStepState.DONE else None,
            )
        )


def metrics_for_criterion(db, criterion_id: str) -> list[Metric]:
    metrics: list[Metric] = []
    for ki in db.query(KeyIndicator).filter(KeyIndicator.criterion_id == criterion_id).all():
        metrics.extend(db.query(Metric).filter(Metric.key_indicator_id == ki.id).all())
    return metrics


def seed_demo_work(
    db,
    institution: Institution,
    cycle: AccreditationCycle,
    iqac: User,
    departments: list[Department],
    criteria: list[Criterion],
) -> None:
    if db.query(Evidence).filter(Evidence.cycle_id == cycle.id).count() > 0:
        print("Demo evidence already present — skipping work artifacts")
        return

    statuses = [
        EvidenceStatus.VERIFIED,
        EvidenceStatus.PENDING_REVIEW,
        EvidenceStatus.NEEDS_CORRECTION,
        EvidenceStatus.VERIFIED,
    ]
    evidence_rows: list[Evidence] = []
    for i, dept in enumerate(departments):
        for c in criteria:
            metrics = metrics_for_criterion(db, c.id)
            if not metrics:
                continue
            metric = metrics[0]
            fu = placeholder_file(
                db, institution.id, iqac.id, f"{c.code}_{dept.code}_{metric.code}.pdf"
            )
            ev = Evidence(
                institution_id=institution.id,
                cycle_id=cycle.id,
                metric_id=metric.id,
                department_id=dept.id,
                file_upload_id=fu.id,
                uploaded_by_id=iqac.id,
                title=f"{metric.name} — {dept.code}",
                unit="Demo Unit",
                notes="Seeded evidence",
                status=statuses[i % len(statuses)],
            )
            db.add(ev)
            evidence_rows.append(ev)
    db.flush()
    print(f"Created {len(evidence_rows)} evidence rows")

    samples = [
        (criteria[0], departments[0], SubmissionStatus.APPROVED, 4, "Criterion 1 Evidence Submission"),
        (criteria[4], departments[2], SubmissionStatus.NEEDS_CORRECTION, 3, "Criterion 5 Student Support Submission"),
        (criteria[2], departments[1], SubmissionStatus.UNDER_REVIEW, 2, "Research Publications Pack"),
        (criteria[3], departments[0], SubmissionStatus.SUBMITTED, 1, "Infrastructure Evidence Bundle"),
    ]
    for idx, (crit, dept, status, workflow_idx, title) in enumerate(samples, start=1):
        sub = Submission(
            institution_id=institution.id,
            cycle_id=cycle.id,
            criterion_id=crit.id,
            department_id=dept.id,
            submitted_by_id=iqac.id,
            title=title,
            ref_code=f"S-{idx:02d}-2026-{crit.code}-R01",
            status=status,
            assigned_to_id=iqac.id,
            submitted_at=datetime.utcnow(),
            correction_note=(
                "Incomplete student progression data. Attach semester-wise sheets."
                if status == SubmissionStatus.NEEDS_CORRECTION
                else None
            ),
            correction_by_id=iqac.id if status == SubmissionStatus.NEEDS_CORRECTION else None,
            correction_at=datetime.utcnow() if status == SubmissionStatus.NEEDS_CORRECTION else None,
        )
        db.add(sub)
        db.flush()
        for ev in evidence_rows:
            if ev.department_id != dept.id:
                continue
            metric = db.get(Metric, ev.metric_id)
            ki = db.get(KeyIndicator, metric.key_indicator_id) if metric else None
            if ki and ki.criterion_id == crit.id:
                db.add(SubmissionEvidence(submission_id=sub.id, evidence_id=ev.id))
                break
        init_workflow(db, sub, workflow_idx)
    print(f"Created {len(samples)} demo submissions")


def seed() -> None:
    db = SessionLocal()
    try:
        institution = db.query(Institution).first()
        if not institution:
            print("No institution found. Run scripts/seed_admin.py first.")
            return

        iqac = ensure_iqac(db, institution)
        departments = ensure_departments(db, institution)
        cycle = ensure_cycle(db, institution)
        criteria = ensure_catalog(db, cycle)
        seed_demo_work(db, institution, cycle, iqac, departments, criteria)
        db.commit()
        print("\nNAAC seed complete.")
        print(f"  IQAC login: {IQAC_EMAIL} / {IQAC_PASSWORD}")
        print(f"  Cycle id:   {cycle.id}")
        print("  Try: GET /api/v1/coordinator/dashboard")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
