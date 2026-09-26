from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import (
    Document,
    Submission,
    User,
)
from app.schemas.document import (
    DocumentCreate,
    DocumentResponse,
)
from app.services.document_service import (
    create_document_record,
    replace_document_file,
)
from app.auth.dependencies import get_current_user


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


# ============================================================
# UPLOAD DIRECTORY
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

UPLOAD_ROOT = (
    BASE_DIR /
    "uploads" /
    "evidence"
)


# ============================================================
# ALLOWED FILE TYPES
# ============================================================

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
# GET ALL DOCUMENTS
# ============================================================

@router.get(
    "",
    response_model=list[DocumentResponse]
)
async def get_documents(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Document)
        .order_by(
            Document.created_at.desc()
        )
    )

    # --------------------------------------------------------
    # Institution-level filtering
    # --------------------------------------------------------

    if current_user.institution_id:
        query = query.filter(
            Document.institution_id
            == current_user.institution_id
        )

    documents = query.all()

    return documents


# ============================================================
# CREATE DOCUMENT
# ============================================================

@router.post(
    "",
    response_model=DocumentResponse
)
async def create_document(
    document_data: DocumentCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    document = create_document_record(
        db=db,
        user=current_user,
        title=document_data.title,
        file_path=document_data.file_path,
        file_type=document_data.file_type,
        file_size=document_data.file_size,
        submission_id=document_data.submission_id,
    )

    return document


# ============================================================
# UPLOAD REAL EVIDENCE FILE
# ============================================================

@router.post(
    "/upload",
    response_model=DocumentResponse
)
async def upload_evidence(
    file: UploadFile = File(...),
    submission_id: int = None,
    title: str = None,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # Validate file
    # --------------------------------------------------------

    if not file:
        raise HTTPException(
            status_code=400,
            detail="Please select a file."
        )

    filename = file.filename or ""

    extension = (
        filename
        .split(".")[-1]
        .lower()
        if "." in filename
        else ""
    )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed types: PDF, DOC, DOCX, "
                "XLS, XLSX, JPG, JPEG and PNG."
            )
        )

    # --------------------------------------------------------
    # Submission validation
    # --------------------------------------------------------

    submission = None

    if submission_id:
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
                detail="Submission not found."
            )

        # ----------------------------------------------------
        # Institution security
        # ----------------------------------------------------

        if (
            current_user.institution_id
            and submission.institution_id
            != current_user.institution_id
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot upload evidence "
                    "to another institution's submission."
                )
            )

        # ----------------------------------------------------
        # Editable submission check
        # ----------------------------------------------------

        editable_statuses = {
            "Draft",
            "Changes Requested",
            "Resubmitted",
        }

        if (
            submission.status
            not in editable_statuses
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Evidence can only be uploaded "
                    "while the submission is editable."
                )
            )

    # --------------------------------------------------------
    # Folder
    # --------------------------------------------------------

    folder_name = (
        f"submission_{submission_id}"
        if submission_id
        else "general"
    )

    upload_dir = (
        UPLOAD_ROOT /
        folder_name
    )

    upload_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    # --------------------------------------------------------
    # Generate safe stored filename
    # --------------------------------------------------------

    stored_name = (
        f"{uuid4().hex}.{extension}"
    )

    destination = (
        upload_dir /
        stored_name
    )

    # --------------------------------------------------------
    # Save file
    # --------------------------------------------------------

    file_size = 0

    with destination.open(
        "wb"
    ) as buffer:

        while True:
            chunk = await file.read(
                1024 * 1024
            )

            if not chunk:
                break

            buffer.write(chunk)

            file_size += len(chunk)

    # --------------------------------------------------------
    # Database path
    # --------------------------------------------------------

    relative_path = (
        f"/uploads/evidence/"
        f"{folder_name}/"
        f"{stored_name}"
    )

    # --------------------------------------------------------
    # Document title
    # --------------------------------------------------------

    document_title = (
        title
        or filename
        or "Evidence Document"
    )

    # --------------------------------------------------------
    # Create database record
    # --------------------------------------------------------

    document = create_document_record(
        db=db,
        user=current_user,
        title=document_title,
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
# PREVIEW DOCUMENT
# ============================================================

@router.get(
    "/{document_id}/preview"
)
async def preview_document(
    document_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # Find document
    # --------------------------------------------------------

    document = (
        db.query(Document)
        .filter(
            Document.id
            == document_id
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    # --------------------------------------------------------
    # Institution security
    # --------------------------------------------------------

    if (
        current_user.institution_id
        and document.institution_id
        != current_user.institution_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot access this document."
            )
        )

    # --------------------------------------------------------
    # Convert database path to filesystem path
    #
    # Example:
    # /uploads/evidence/submission_16/file.png
    #
    # becomes:
    # backend/uploads/evidence/submission_16/file.png
    # --------------------------------------------------------

    relative_path = (
        document.file_path
        .lstrip("/")
    )

    file_path = (
        BASE_DIR /
        relative_path
    )

    # --------------------------------------------------------
    # Check physical file
    # --------------------------------------------------------

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Evidence file not found on server."
            )
        )

    # --------------------------------------------------------
    # Preview
    # --------------------------------------------------------

    return FileResponse(
        path=str(file_path),
        media_type=(
            document.file_type
            or "application/octet-stream"
        ),
        content_disposition_type="inline",
    )


# ============================================================
# DOWNLOAD DOCUMENT
# ============================================================

@router.get(
    "/{document_id}/download"
)
async def download_document(
    document_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # Find document
    # --------------------------------------------------------

    document = (
        db.query(Document)
        .filter(
            Document.id
            == document_id
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    # --------------------------------------------------------
    # Institution security
    # --------------------------------------------------------

    if (
        current_user.institution_id
        and document.institution_id
        != current_user.institution_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot access this document."
            )
        )

    # --------------------------------------------------------
    # Convert database path to filesystem path
    # --------------------------------------------------------

    relative_path = (
        document.file_path
        .lstrip("/")
    )

    file_path = (
        BASE_DIR /
        relative_path
    )

    # --------------------------------------------------------
    # Check physical file
    # --------------------------------------------------------

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Evidence file not found on server."
            )
        )

    # --------------------------------------------------------
    # Download filename
    # --------------------------------------------------------

    download_name = (
        document.title
        or file_path.name
    )

    # --------------------------------------------------------
    # Download
    # --------------------------------------------------------

    return FileResponse(
        path=str(file_path),
        filename=download_name,
        media_type=(
            document.file_type
            or "application/octet-stream"
        ),
        content_disposition_type="attachment",
    )


# ============================================================
# REPLACE EVIDENCE FILE
# ============================================================

@router.put(
    "/{document_id}/replace",
    response_model=DocumentResponse
)
async def replace_document(
    document_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # Validate file
    # --------------------------------------------------------

    if not file:
        raise HTTPException(
            status_code=400,
            detail="Please select a file."
        )

    filename = file.filename or ""

    extension = (
        filename
        .split(".")[-1]
        .lower()
        if "." in filename
        else ""
    )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed types: PDF, DOC, DOCX, "
                "XLS, XLSX, JPG, JPEG and PNG."
            )
        )

    # --------------------------------------------------------
    # Find document
    # --------------------------------------------------------

    document = (
        db.query(Document)
        .filter(
            Document.id
            == document_id
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    # --------------------------------------------------------
    # Institution security
    # --------------------------------------------------------

    if (
        current_user.institution_id
        and document.institution_id
        != current_user.institution_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot replace this document."
            )
        )

    # --------------------------------------------------------
    # Submission validation
    # --------------------------------------------------------

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

            editable_statuses = {
                "Draft",
                "Changes Requested",
                "Resubmitted",
            }

            if (
                submission.status
                not in editable_statuses
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Evidence can only be replaced "
                        "while the submission is editable."
                    )
                )

    # --------------------------------------------------------
    # Upload folder
    # --------------------------------------------------------

    folder_name = (
        f"submission_{document.submission_id}"
        if document.submission_id
        else "general"
    )

    upload_dir = (
        UPLOAD_ROOT /
        folder_name
    )

    upload_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    # --------------------------------------------------------
    # Generate new physical filename
    # --------------------------------------------------------

    stored_name = (
        f"{uuid4().hex}.{extension}"
    )

    destination = (
        upload_dir /
        stored_name
    )

    # --------------------------------------------------------
    # Save replacement file
    # --------------------------------------------------------

    file_size = 0

    with destination.open(
        "wb"
    ) as buffer:

        while True:
            chunk = await file.read(
                1024 * 1024
            )

            if not chunk:
                break

            buffer.write(chunk)

            file_size += len(chunk)

    # --------------------------------------------------------
    # Database path
    # --------------------------------------------------------

    relative_path = (
        f"/uploads/evidence/"
        f"{folder_name}/"
        f"{stored_name}"
    )

    # --------------------------------------------------------
    # Create new document version
    # --------------------------------------------------------

    updated_document = (
        replace_document_file(
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
    )

    return updated_document