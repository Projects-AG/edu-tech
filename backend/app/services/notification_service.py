from sqlalchemy.orm import Session
from app.models import Notification, User


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
    db.flush()  # Flush to get the ID of the new notification
    return notif


def notify_role_users(
    db: Session,
    role_name: str,
    title: str,
    message: str,
    institution_id: int = None,
    notif_type: str = "info"
):
    query = db.query(User).filter(User.is_active == True)
    if institution_id:
        query = query.filter(User.institution_id == institution_id)
    
    users = query.all()
    for user in users:
        if user.role and user.role.name == role_name:
            notif = Notification(
                user_id=user.id,
                title=title,
                message=message,
                type=notif_type,
                is_read=False
            )
            db.add(notif)
    db.flush()
