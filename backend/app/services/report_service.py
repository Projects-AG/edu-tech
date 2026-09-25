from sqlalchemy.orm import Session
from app.models import (
    Submission,
    Criterion,
    Department,
    Document,
    Review,
    AccreditationCycle
)


def calculate_institution_reports(db: Session, institution_id: int = None) -> dict:
    sub_query = db.query(Submission)
    doc_query = db.query(Document)
    dept_query = db.query(Department)

    if institution_id:
        sub_query = sub_query.filter(Submission.institution_id == institution_id)
        doc_query = doc_query.filter(Document.institution_id == institution_id)
        dept_query = dept_query.filter(Department.institution_id == institution_id)

    total_submissions = sub_query.count()
    draft_count = sub_query.filter(Submission.status == "Draft").count()
    submitted_count = sub_query.filter(Submission.status == "Submitted").count()
    under_review_count = sub_query.filter(Submission.status == "Under Review").count()
    approved_count = sub_query.filter(Submission.status == "Approved").count()
    rejected_count = sub_query.filter(Submission.status == "Rejected").count()
    changes_requested_count = sub_query.filter(Submission.status == "Changes Requested").count()

    total_documents = doc_query.count()
    total_departments = dept_query.count()

    # Calculate Criterion completion metrics
    criteria = db.query(Criterion).all()
    criterion_metrics = []
    total_comp_sum = 0.0

    for c in criteria:
        # Calculate completion from submissions for this criterion
        c_subs = sub_query.filter(Submission.criterion_id == c.id).count()
        c_approved = sub_query.filter(Submission.criterion_id == c.id, Submission.status == "Approved").count()
        rate = round((c_approved / c_subs * 100), 1) if c_subs > 0 else c.completion_percentage
        criterion_metrics.append({
            "id": c.id,
            "number": c.number,
            "title": c.title,
            "weightage": c.weightage,
            "total_submissions": c_subs,
            "approved_submissions": c_approved,
            "completion_percentage": rate
        })
        total_comp_sum += rate

    overall_completion = round((total_comp_sum / len(criteria)), 1) if criteria else 0.0
    approval_rate = round((approved_count / total_submissions * 100), 1) if total_submissions > 0 else 0.0

    # Department breakdown
    departments = dept_query.all()
    department_metrics = []
    for d in departments:
        d_subs = sub_query.filter(Submission.department_id == d.id).count()
        d_app = sub_query.filter(Submission.department_id == d.id, Submission.status == "Approved").count()
        department_metrics.append({
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "total_submissions": d_subs,
            "approved_submissions": d_app,
            "completion_percentage": round((d_app / d_subs * 100), 1) if d_subs > 0 else 0.0
        })

    return {
        "overall_completion_percentage": overall_completion,
        "approval_rate_percentage": approval_rate,
        "submission_funnel": {
            "total": total_submissions,
            "draft": draft_count,
            "submitted": submitted_count,
            "under_review": under_review_count,
            "approved": approved_count,
            "rejected": rejected_count,
            "changes_requested": changes_requested_count,
        },
        "evidence": {
            "total_documents": total_documents,
            "pending_evidence": draft_count + changes_requested_count
        },
        "criterion_performance": criterion_metrics,
        "department_performance": department_metrics
    }
