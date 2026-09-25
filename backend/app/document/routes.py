from pathlib import Path
from uuid import uuid4
from typing import List

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
)
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, get_current_user
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

UPLOAD_ROOT = (
    Path(__file__).resolve().parents[2]
    / "uploads"
    / "evidence"
)

UPLOAD_ROOT.mkdir(
    parents=True,
    exist_ok=True
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Document)

    if current_user.institution_id:
        query = query.filter(
            Document.institution_id
            == current_user.institution_id
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
        current_user.institution_id
        and document.institution_id
        != current_user.institution_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot view another institution's document"
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inst_id = current_user.institution_id or 1

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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

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

        if (
            current_user.institution_id
            and submission.institution_id
            != current_user.institution_id
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot upload evidence "
                    "to another institution's submission"
                )
            )

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

        metric = None

        if submission.metric_code:

            metric = (
                db.query(Metric)
                .filter(
                    Metric.code
                    == submission.metric_code
                )
                .first()
            )

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
# REPLACE DOCUMENT / CREATE NEW VERSION
# ============================================================

@router.put(
    "/{document_id}/replace",
    response_model=DocumentResponse
)
async def replace_document(
    document_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

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
        current_user.institution_id
        and document.institution_id
        != current_user.institution_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot replace another institution's document"
        )

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