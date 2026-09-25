from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Document, DocumentVersion, User, Submission


def create_document_record(
    db: Session,
    user: User,
    title: str,
    file_path: str,
    file_type: str = None,
    file_size: int = None,
    submission_id: int = None
) -> Document:

    inst_id = user.institution_id or 1

    if submission_id:
        sub = db.query(Submission).filter(
            Submission.id == submission_id
        ).first()

        if sub and user.institution_id and sub.institution_id != user.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Cannot attach document to another institution's submission"
            )

    doc = Document(
        institution_id=inst_id,
        submission_id=submission_id,
        uploaded_by=user.id,
        title=title,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        status="Uploaded"
    )

    db.add(doc)
    db.flush()

    version = DocumentVersion(
        document_id=doc.id,
        version_number=1,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        uploaded_by=user.id,
        is_current=True
    )

    db.add(version)

    db.commit()
    db.refresh(doc)

    return doc

def replace_document_file(
    db: Session,
    user: User,
    document_id: int,
    file_path: str,
    file_type: str = None,
    file_size: int = None,
) -> Document:

    document = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if (
        user.institution_id
        and document.institution_id != user.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot replace another institution's document"
        )

    current_version = (
        db.query(DocumentVersion)
        .filter(
            DocumentVersion.document_id == document.id,
            DocumentVersion.is_current == True
        )
        .first()
    )

    if current_version:
        current_version.is_current = False

        next_version = (
            db.query(DocumentVersion.version_number)
            .filter(
                DocumentVersion.document_id == document.id
            )
            .order_by(
                DocumentVersion.version_number.desc()
            )
            .first()
        )

        version_number = next_version[0] + 1
    else:
        version_number = 1

    new_version = DocumentVersion(
        document_id=document.id,
        version_number=version_number,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        uploaded_by=user.id,
        is_current=True
    )

    db.add(new_version)

    document.file_path = file_path
    document.file_type = file_type
    document.file_size = file_size
    document.uploaded_by = user.id

    db.commit()
    db.refresh(document)

    return document