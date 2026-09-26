from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import (
    Document,
    DocumentVersion,
    User,
    Submission,
)


EDITABLE_SUBMISSION_STATUSES = {
    "Draft",
    "Changes Requested",
    "Resubmitted",
}


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

    # ------------------------------------------------------------
    # Validate submission ownership
    # ------------------------------------------------------------

    if submission_id:
        sub = (
            db.query(Submission)
            .filter(
                Submission.id == submission_id
            )
            .first()
        )

        if sub and user.institution_id:
            if (
                sub.institution_id
                != user.institution_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "Forbidden: Cannot attach document "
                        "to another institution's submission"
                    )
                )

    # ------------------------------------------------------------
    # Create document
    # ------------------------------------------------------------

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

    # Get generated document ID
    db.flush()

    # ------------------------------------------------------------
    # Create Version 1
    # ------------------------------------------------------------

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
    file_size: int = None
) -> Document:

    # ------------------------------------------------------------
    # Find document
    # ------------------------------------------------------------

    document = (
        db.query(Document)
        .filter(
            Document.id == document_id
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # ------------------------------------------------------------
    # Institution permission
    # ------------------------------------------------------------

    if (
        user.institution_id
        and document.institution_id
        != user.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot replace this document"
        )

    # ------------------------------------------------------------
    # Submission permission
    # ------------------------------------------------------------

    if document.submission_id:

        submission = (
            db.query(Submission)
            .filter(
                Submission.id
                == document.submission_id
            )
            .first()
        )

        if submission:

            if (
                submission.status
                not in EDITABLE_SUBMISSION_STATUSES
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Evidence can only be replaced "
                        "while the submission is editable"
                    )
                )

    # ------------------------------------------------------------
    # Get existing versions
    # ------------------------------------------------------------

    previous_versions = (
        db.query(DocumentVersion)
        .filter(
            DocumentVersion.document_id
            == document.id
        )
        .order_by(
            DocumentVersion.version_number.desc()
        )
        .all()
    )

    # ============================================================
    # IMPORTANT:
    # Old documents may have been created before the versioning
    # system existed.
    #
    # In that case there will be no DocumentVersion row.
    #
    # We treat the document's CURRENT file as Version 1 first.
    # Then the replacement becomes Version 2.
    # ============================================================

    if not previous_versions:

        original_version = DocumentVersion(
            document_id=document.id,
            version_number=1,
            file_path=document.file_path,
            file_type=document.file_type,
            file_size=document.file_size,
            uploaded_by=document.uploaded_by,
            is_current=False
        )

        db.add(original_version)

        next_version = 2

    else:

        next_version = (
            previous_versions[0].version_number
            + 1
        )

        # --------------------------------------------------------
        # Mark all previous versions as not current
        # --------------------------------------------------------

        for version in previous_versions:
            version.is_current = False

    # ------------------------------------------------------------
    # Create new version
    # ------------------------------------------------------------

    new_version = DocumentVersion(
        document_id=document.id,
        version_number=next_version,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        uploaded_by=user.id,
        is_current=True
    )

    db.add(new_version)

    # ------------------------------------------------------------
    # Update main Document record
    # ------------------------------------------------------------

    document.file_path = file_path
    document.file_type = file_type
    document.file_size = file_size
    document.status = "Uploaded"

    # ------------------------------------------------------------
    # Save everything
    # ------------------------------------------------------------

    db.commit()
    db.refresh(document)

    return document