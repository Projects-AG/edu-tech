import mimetypes
from pathlib import Path
from uuid import uuid4
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_db,
    get_current_user,
    require_permission,
)
from app.auth.registration_authority import ADMIN, get_role_name
from app.models import (
    Document,
    DocumentVersion,
    User,
    Submission,
    Metric,
    EvidenceRequirement,
)
from app.schemas.document import (
    DocumentCreate,
    DocumentResponse,
    DocumentVersionResponse,
)
from app.services.document_service import (
    create_document_record,
    replace_document_file,
)


router = APIRouter(
    prefix="/documents",
    tags=["Documents & Evidence"]
)


# ============================================================
# LOCAL FILE STORAGE
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

UPLOAD_ROOT = (
    BASE_DIR
    / "uploads"
    / "evidence"
)

UPLOAD_ROOT.mkdir(
    parents=True,
    exist_ok=True
)


DEPARTMENT_SCOPED_ROLES = {
    "Dept. Coordinator",
    "Committee Member",
}


def is_platform_admin(db: Session, user: User) -> bool:
    return get_role_name(db, user.role_id) == ADMIN


def assigned_department_id(user: User) -> int | None:
    department_id = user.department_id
    if not department_id:
        return None
    return department_id


def require_user_institution(db: Session, current_user: User) -> None:
    if is_platform_admin(db, current_user):
        return

    if not current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to an institution",
        )


def assert_evidence_write_access(
    db: Session,
    current_user: User,
    submission: Submission | None,
) -> None:
    """Evidence is written only by institution users for their own scope."""
    if is_platform_admin(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Platform Admin cannot upload or change institution evidence"
            ),
        )

    if not current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to an institution",
        )

    if (
        submission is not None
        and submission.institution_id != current_user.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You cannot upload evidence "
                "to another institution's submission"
            ),
        )

    role_name = get_role_name(db, current_user.role_id)
    if role_name not in DEPARTMENT_SCOPED_ROLES:
        return

    user_department_id = assigned_department_id(current_user)
    if not user_department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to a department",
        )
    if submission is None or submission.department_id != user_department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Evidence can only be attached to a submission "
                "of your assigned department"
            ),
        )


ALLOWED_EXTENSIONS = {
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "jpg",
    "jpeg",
    "png",
}


# ============================================================
# GET DOCUMENTS
# ============================================================

@router.get(
    "",
    response_model=List[DocumentResponse]
)
def get_documents(
    submission_id: Optional[int] = None,
    current_user: User = Depends(
        require_permission("EVIDENCE", "View")
    ),
    db: Session = Depends(get_db)
):
    require_user_institution(db, current_user)

    query = db.query(Document)

    if current_user.institution_id:
        query = query.filter(
            Document.institution_id
            == current_user.institution_id
        )

    if submission_id is not None:
        query = query.filter(
            Document.submission_id == submission_id
        )

    role_name = get_role_name(db, current_user.role_id)
    if role_name in DEPARTMENT_SCOPED_ROLES:
        user_department_id = assigned_department_id(current_user)
        if not user_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not assigned to a department",
            )
        query = query.join(
            Submission,
            Document.submission_id == Submission.id,
        ).filter(
            Submission.department_id == user_department_id
        )

    return query.order_by(
        Document.created_at.desc()
    ).all()


# ============================================================
# GET DOCUMENT VERSION HISTORY
# ============================================================

@router.get(
    "/{document_id}/versions",
    response_model=List[DocumentVersionResponse]
)
def get_document_versions(
    document_id: int,
    current_user: User = Depends(
        require_permission("EVIDENCE", "View")
    ),
    db: Session = Depends(get_db)
):
    document = get_accessible_document(
        document_id,
        current_user,
        db
    )

    return (
        db.query(DocumentVersion)
        .filter(
            DocumentVersion.document_id
            == document_id
        )
        .order_by(
            DocumentVersion.version_number.desc()
        )
        .all()
    )


# ============================================================
# EXISTING RECORD CREATION
# ============================================================

@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED
)
def create_document(
    doc_data: DocumentCreate,
    current_user: User = Depends(
        require_permission("EVIDENCE", "Upload")
    ),
    db: Session = Depends(get_db)
):
    submission = None
    if doc_data.submission_id is not None:
        submission = (
            db.query(Submission)
            .filter(Submission.id == doc_data.submission_id)
            .first()
        )
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found",
            )
    assert_evidence_write_access(db, current_user, submission)

    inst_id = current_user.institution_id

    doc = Document(
        institution_id=inst_id,
        submission_id=doc_data.submission_id,
        uploaded_by=current_user.id,
        title=doc_data.title,
        file_path=doc_data.file_path,
        file_type=doc_data.file_type,
        file_size=doc_data.file_size,
        status="Uploaded"
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    return doc


# ============================================================
# REAL FILE UPLOAD
# ============================================================

@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_document(
    file: UploadFile = File(...),
    submission_id: int | None = Form(None),
    title: str | None = Form(None),
    current_user: User = Depends(
        require_permission("EVIDENCE", "Upload")
    ),
    db: Session = Depends(get_db)
):
    require_user_institution(db, current_user)

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    original_name = Path(
        file.filename
    ).name

    extension = (
        Path(original_name)
        .suffix
        .lower()
        .replace(".", "")
    )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed types: "
                + ", ".join(
                    sorted(ALLOWED_EXTENSIONS)
                )
            )
        )

    submission = None
    evidence_requirement = None

    # --------------------------------------------------------
    # Validate submission
    # --------------------------------------------------------

    if submission_id is not None:

        submission = (
            db.query(Submission)
            .filter(
                Submission.id
                == submission_id
            )
            .first()
        )

        if not submission:
            raise HTTPException(
                status_code=404,
                detail="Submission not found"
            )

    assert_evidence_write_access(db, current_user, submission)

    if submission is not None:

        if submission.status not in {
            "Draft",
            "Changes Requested",
            "Resubmitted",
        }:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Evidence can only be uploaded "
                    "while the submission is editable"
                )
            )

        # ----------------------------------------------------
        # Find metric
        # ----------------------------------------------------

        from app.services.operational_metric_service import (
            resolve_metric_for_submission,
        )

        metric = resolve_metric_for_submission(db, submission)

        # ----------------------------------------------------
        # Find evidence requirement
        # ----------------------------------------------------

        if metric:

            evidence_requirement = (
                db.query(EvidenceRequirement)
                .filter(
                    EvidenceRequirement.metric_id
                    == metric.id
                )
                .first()
            )

        # ----------------------------------------------------
        # Validate required file type
        # ----------------------------------------------------

        if evidence_requirement:

            allowed_types = {
                item.strip()
                .lower()
                for item in (
                    evidence_requirement
                    .allowed_file_types
                    .split(",")
                    if evidence_requirement.allowed_file_types
                    else []
                )
            }

            if (
                allowed_types
                and extension
                not in allowed_types
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"File type '.{extension}' "
                        "is not allowed for this metric"
                    )
                )

            # ------------------------------------------------
            # Validate maximum number of files
            # ------------------------------------------------

            existing_count = (
                db.query(Document)
                .filter(
                    Document.submission_id
                    == submission_id
                )
                .count()
            )

            max_files = (
                evidence_requirement.max_files
                or 5
            )

            if existing_count >= max_files:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Maximum of {max_files} "
                        "evidence files allowed"
                    )
                )

    # --------------------------------------------------------
    # Save physical file
    # --------------------------------------------------------

    folder_name = (
        f"submission_{submission_id}"
        if submission_id
        else "general"
    )

    upload_dir = (
        UPLOAD_ROOT
        / folder_name
    )

    upload_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    stored_name = (
        f"{uuid4().hex}.{extension}"
    )

    destination = (
        upload_dir / stored_name
    )

    file_size = 0

    with destination.open("wb") as buffer:

        while True:

            chunk = await file.read(
                1024 * 1024
            )

            if not chunk:
                break

            buffer.write(chunk)

            file_size += len(chunk)

    # --------------------------------------------------------
    # Create database record
    # --------------------------------------------------------

    relative_path = (
        f"/uploads/evidence/"
        f"{folder_name}/"
        f"{stored_name}"
    )

    document = create_document_record(
        db=db,
        user=current_user,
        title=(
            title.strip()
            if title
            else original_name
        ),
        file_path=relative_path,
        file_type=(
            file.content_type
            or extension
        ),
        file_size=file_size,
        submission_id=submission_id,
    )

    return document


# ============================================================
# EVIDENCE FILE ACCESS HELPERS
# ============================================================

def get_accessible_document(
    document_id: int,
    current_user: User,
    db: Session
) -> Document:
    """
    Load a document and enforce institution and department access.
    """

    document = (
        db.query(Document)
        .filter(
            Document.id == document_id
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    require_user_institution(db, current_user)

    if (
        not is_platform_admin(db, current_user)
        and document.institution_id
        != current_user.institution_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot access another "
                "institution's evidence file"
            )
        )

    role_name = get_role_name(db, current_user.role_id)
    if role_name in DEPARTMENT_SCOPED_ROLES:
        user_department_id = assigned_department_id(current_user)
        if not user_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not assigned to a department",
            )

        submission = None
        if document.submission_id:
            submission = (
                db.query(Submission)
                .filter(Submission.id == document.submission_id)
                .first()
            )

        if (
            not submission
            or submission.department_id != user_department_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You cannot access evidence "
                    "from another department"
                )
            )

    return document


def resolve_evidence_file(
    document: Document
) -> Path:
    """
    Map the stored path (e.g. /uploads/evidence/submission_16/x.png)
    onto the filesystem, refusing anything that escapes UPLOAD_ROOT.
    """

    stored_path = (
        document.file_path or ""
    ).strip()

    if not stored_path:
        raise HTTPException(
            status_code=404,
            detail=(
                "Evidence file not found on server"
            )
        )

    file_path = (
        BASE_DIR
        / stored_path.lstrip("/\\")
    ).resolve()

    # Reject path traversal such as
    # /uploads/evidence/../../.env
    if not file_path.is_relative_to(
        UPLOAD_ROOT.resolve()
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Invalid evidence file path"
            )
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=(
                "Evidence file not found on server"
            )
        )

    return file_path


def resolve_media_type(
    document: Document,
    file_path: Path
) -> str:
    """
    Uploads store either a MIME type or a bare extension,
    so only trust file_type when it actually looks like a MIME type.
    """

    file_type = (
        document.file_type or ""
    ).strip()

    if "/" in file_type:
        return file_type

    guessed, _ = mimetypes.guess_type(
        file_path.name
    )

    return (
        guessed
        or "application/octet-stream"
    )


def resolve_evidence_filename(
    document: Document,
    file_path: Path
) -> str:
    """
    Prefer the human-readable title, falling back to the stored
    name. Titles are entered without an extension, so add one.
    """

    name = (
        document.title or ""
    ).strip() or file_path.name

    if not Path(name).suffix:
        name = (
            f"{name}"
            f"{file_path.suffix}"
        )

    return name


# ============================================================
# PREVIEW DOCUMENT
# ============================================================

@router.get(
    "/{document_id}/preview"
)
def preview_document(
    document_id: int,
    current_user: User = Depends(
        require_permission("EVIDENCE", "View")
    ),
    db: Session = Depends(get_db)
):

    document = get_accessible_document(
        document_id,
        current_user,
        db
    )

    file_path = resolve_evidence_file(
        document
    )

    return FileResponse(
        path=str(file_path),
        filename=resolve_evidence_filename(
            document,
            file_path
        ),
        media_type=resolve_media_type(
            document,
            file_path
        ),
        content_disposition_type="inline",
    )


# ============================================================
# DOWNLOAD DOCUMENT
# ============================================================

@router.get(
    "/{document_id}/download"
)
def download_document(
    document_id: int,
    current_user: User = Depends(
        require_permission("EVIDENCE", "View")
    ),
    db: Session = Depends(get_db)
):

    document = get_accessible_document(
        document_id,
        current_user,
        db
    )

    file_path = resolve_evidence_file(
        document
    )

    return FileResponse(
        path=str(file_path),
        filename=resolve_evidence_filename(
            document,
            file_path
        ),
        media_type=resolve_media_type(
            document,
            file_path
        ),
        content_disposition_type="attachment",
    )


# ============================================================
# REPLACE DOCUMENT / CREATE NEW VERSION
# ============================================================

@router.put(
    "/{document_id}/replace",
    response_model=DocumentResponse
)
async def replace_document(
    document_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(
        require_permission("EVIDENCE", "Upload")
    ),
    db: Session = Depends(get_db)
):
    require_user_institution(db, current_user)

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    document = (
        db.query(Document)
        .filter(
            Document.id == document_id
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    if (
        not is_platform_admin(db, current_user)
        and document.institution_id
        != current_user.institution_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot replace another institution's document"
        )

    document_submission = None
    if document.submission_id:
        document_submission = (
            db.query(Submission)
            .filter(Submission.id == document.submission_id)
            .first()
        )
    assert_evidence_write_access(db, current_user, document_submission)

    original_name = Path(file.filename).name

    extension = (
        Path(original_name)
        .suffix
        .lower()
        .replace(".", "")
    )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed types: "
                + ", ".join(
                    sorted(ALLOWED_EXTENSIONS)
                )
            )
        )

    folder_name = (
        f"submission_{document.submission_id}"
        if document.submission_id
        else "general"
    )

    upload_dir = (
        UPLOAD_ROOT
        / folder_name
    )

    upload_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    stored_name = (
        f"{uuid4().hex}.{extension}"
    )

    destination = (
        upload_dir / stored_name
    )

    file_size = 0

    with destination.open("wb") as buffer:

        while True:

            chunk = await file.read(
                1024 * 1024
            )

            if not chunk:
                break

            buffer.write(chunk)

            file_size += len(chunk)

    relative_path = (
        f"/uploads/evidence/"
        f"{folder_name}/"
        f"{stored_name}"
    )

    updated_document = replace_document_file(
        db=db,
        user=current_user,
        document_id=document_id,
        file_path=relative_path,
        file_type=(
            file.content_type
            or extension
        ),
        file_size=file_size,
    )

    return updated_document