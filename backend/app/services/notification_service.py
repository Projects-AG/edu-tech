from sqlalchemy.orm import Session
from app.models import Notification, User, Role


def send_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notif_type: str = "info"
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        is_read=False
    )
    db.add(notif)
    db.flush()
    return notif


def notify_role_users(
    db: Session,
    role_name: str,
    title: str,
    message: str,
    institution_id: int = None,
    notif_type: str = "info"
):
    """
    Notify active users who hold the given role.

    User has no Role relationship — join on role_id.
    """

    query = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(
            User.is_active == True,
            Role.name == role_name,
        )
    )

    if institution_id:
        query = query.filter(
            User.institution_id == institution_id
        )

    for user in query.all():
        send_notification(
            db=db,
            user_id=user.id,
            title=title,
            message=message,
            notif_type=notif_type,
        )
