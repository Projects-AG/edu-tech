from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Submission, User
from app.services.notification_service import send_notification, notify_role_users

VALID_TRANSITIONS = {
    "Draft": ["Submitted"],
    "Submitted": ["Under Review"],
    "Under Review": ["Approved", "Rejected", "Changes Requested"],
    "Changes Requested": ["Resubmitted"],
    "Approved": ["Final Approval", "Changes Requested", "Rejected"],  # Final state
    "Final Approval": ["Final Submitted"],  # No further transitions
    "Final Submitted": [],
    "Rejected": ["Draft"]  # Can revert to Draft if resubmission requested
}


def transition_submission_state(
    db: Session,
    submission: Submission,
    new_status: str,
    actor_user: User
) -> Submission:
    current_status = submission.status or "Draft"

    #transition validity check
    allowed_transition = VALID_TRANSITIONS.get(current_status, [])

    if new_status not in allowed_transition:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition from '{current_status}' to '{new_status}'"
        )

    submission.status = new_status  #submission state updated

    #make change visible in current transition but not committing it yet
    db.flush()
    
    

    # Notifications
    if new_status == "Submitted":
        notify_role_users(
            db=db,
            role_name="Reviewer",
            title="New Submission Awaiting Review",
            message=f"Submission '{submission.title}' has been submitted for review.",
            institution_id=submission.institution_id,
            notif_type="info"
        )
        notify_role_users(
            db=db,
            role_name="NAAC Coordinator",
            title="Submission Received",
            message=f"Submission '{submission.title}' is ready for workflow review.",
            institution_id=submission.institution_id,
            notif_type="info"
        )

    elif new_status == "Approved":
        send_notification(
            db=db,
            user_id=submission.user_id,
            title="Submission Approved",
            message=f"Your submission '{submission.title}' was approved by Data Approver.",
            notif_type="success"
        )

    elif new_status == "Rejected":
        send_notification(
            db=db,
            user_id=submission.user_id,
            title="Submission Rejected",
            message=f"Your submission '{submission.title}' was rejected.",
            notif_type="error"
        )

    elif new_status == "Changes Requested":
        send_notification(
            db=db,
            user_id=submission.user_id,
            title="Changes Requested on Submission",
            message=f"Reviewer requested modifications on '{submission.title}'. Please update and resubmit.",
            notif_type="warning"
        )

    return submission
