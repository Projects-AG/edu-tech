import mimetypes
import os
from io import BytesIO
from pathlib import Path
from urllib.parse import quote
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
from fastapi.responses import FileResponse, Response
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

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
    _BOTO3_AVAILABLE = True
except ImportError:
    boto3 = None
    BotoCoreError = Exception
    ClientError = Exception
    _BOTO3_AVAILABLE = False


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
# SUPABASE STORAGE CLIENT AND HELPERS
# ============================================================

# Initialize boto3 S3-compatible client at module level.
# If storage configuration is incomplete, the client will be None
# and all storage operations fall back to local filesystem behavior.
_s3_client = None
_s3_bucket = None

try:
    from app.core.config import settings as _storage_settings
    _s3_bucket = _storage_settings.storage_bucket
    if (
        _BOTO3_AVAILABLE
        and _storage_settings.storage_endpoint
        and _storage_settings.storage_access_key
        and _storage_settings.storage_secret_key
    ):
        _s3_client = boto3.client(
            "s3",
            endpoint_url=_storage_settings.storage_endpoint,
            aws_access_key_id=_storage_settings.storage_access_key,
            aws_secret_access_key=_storage_settings.storage_secret_key,
        )
except Exception:
    _s3_client = None
    _s3_bucket = None


def _get_s3_client():
    """Return the module-level boto3 S3 client, or None."""
    return _s3_client


def _get_s3_bucket():
    """Return the configured Supabase bucket name."""
    return _s3_bucket


def is_legacy_local_path(file_path: str) -> bool:
    """Return True if file_path uses the legacy local filesystem format."""
    return file_path.startswith("/uploads/evidence/")


def _is_production_environment() -> bool:
    """Return True if running in production."""
    env = os.getenv("ENVIRONMENT", "development").strip().lower()
    return env in {"production", "prod"}


def _storage_configured_for_production() -> bool:
    """Check if storage is correctly configured for production use.

    Returns False if:
    - boto3 is not available
    - s3 client is None
    - endpoint is localhost/default
    - bucket is empty
    """
    if not _BOTO3_AVAILABLE:
        return False
    client = _get_s3_client()
    bucket = _get_s3_bucket()
    if client is None or not bucket:
        return False
    # Check endpoint is not localhost/default
    endpoint = os.getenv("STORAGE_ENDPOINT", "").strip()
    if not endpoint:
        endpoint = "http://localhost:9000"  # default from config
    lower = endpoint.lower()
    if "localhost" in lower or "127.0.0.1" in lower:
        return False
    return True


def _safe_content_disposition(filename: str, inline: bool = True) -> str:
    """Construct a safe Content-Disposition header value.

    Prevents CR/LF header injection and handles quotes and non-ASCII.
    """
    # Remove CR/LF to prevent header injection
    safe = filename.replace("\r", "").replace("\n", "")
    # Escape double quotes for the filename parameter
    escaped = safe.replace('"', '\\"')
    # RFC 5987 percent-encoding for the filename* parameter
    encoded = quote(safe, safe="")
    disposition = "inline" if inline else "attachment"
    return f'{disposition}; filename="{escaped}"; filename*=UTF-8\'\'{encoded}'


def upload_to_supabase(file_obj, key: str) -> None:
    """Upload a file-like object to Supabase Storage (private bucket)."""
    client = _get_s3_client()
    bucket = _get_s3_bucket()
    if client is None or bucket is None:
        raise HTTPException(
            status_code=500,
            detail="Supabase Storage is not configured.",
        )
    try:
        client.upload_fileobj(file_obj, bucket, key)
    except (BotoCoreError, ClientError):
        raise HTTPException(
            status_code=500,
            detail="Failed to upload evidence to Supabase Storage.",
        )


def read_from_supabase(key: str) -> bytes:
    """Download raw bytes from Supabase Storage."""
    client = _get_s3_client()
    bucket = _get_s3_bucket()
    if client is None or bucket is None:
        raise HTTPException(
            status_code=500,
            detail="Supabase Storage is not configured.",
        )
    try:
        response = client.get_object(Bucket=bucket, Key=key)
        return response["Body"].read()
    except (BotoCoreError, ClientError):
        raise HTTPException(
            status_code=404,
            detail="Evidence file not found in Supabase Storage.",
        )


def delete_from_supabase(key: str) -> None:
    """Delete an object from Supabase Storage. Does not raise."""
    client = _get_s3_client()
    bucket = _get_s3_bucket()
    if client is None or bucket is None:
        return
    try:
        client.delete_object(Bucket=bucket, Key=key)
    except (BotoCoreError, ClientError):
        logger.warning(
            "Failed to delete Supabase object (may already be gone): %s", key
        )


def _supabase_media_type(document: Document, key: str) -> str:
    """Resolve media type from document metadata or Supabase key extension."""
    file_type = (document.file_type or "").strip()
    if "/" in file_type:
        return file_type
    guessed, _ = mimetypes.guess_type(key)
    return guessed or "application/octet-stream"


def _supabase_filename(document: Document, key: str) -> str:
    """Resolve filename from document title or Supabase key's last segment."""
    name = (document.title or "").strip() or key.split("/")[-1]
    if not Path(name).suffix and "." in key.split("/")[-1]:
        name = f"{name}{Path(key.split('/')[-1]).suffix}"
    return name


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

    stored_name = (
        f"{uuid4().hex}.{extension}"
    )

    # Read file content for size computation and storage upload.
    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Determine storage backend: Supabase (preferred) or local fallback.
    if _is_production_environment() and not _storage_configured_for_production():
        raise HTTPException(
            status_code=500,
            detail="Supabase Storage is not configured for production.",
        )

    if _s3_client is not None:
        # New uploads use Supabase Storage bucket-relative keys
        # (no leading slash).
        key = f"evidence/{folder_name}/{stored_name}"
        try:
            upload_to_supabase(BytesIO(file_bytes), key)
        except HTTPException:
            raise
        relative_path = key
    else:
        if _is_production_environment():
            raise HTTPException(
                status_code=500,
                detail="Supabase Storage is not configured for production.",
            )
        # Legacy local fallback — permitted only in development.
        upload_dir = UPLOAD_ROOT / folder_name
        upload_dir.mkdir(parents=True, exist_ok=True)
        destination = upload_dir / stored_name
        with destination.open("wb") as buffer:
            buffer.write(file_bytes)
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

    stored = document.file_path or ""

    # Legacy local file — use existing FileResponse logic.
    if is_legacy_local_path(stored):
        file_path = resolve_evidence_file(document)
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

    # Supabase Storage object — download bytes and stream.
    file_bytes = read_from_supabase(stored)
    return Response(
        content=file_bytes,
        media_type=_supabase_media_type(document, stored),
        headers={
            "Content-Disposition": _safe_content_disposition(
                _supabase_filename(document, stored),
                inline=True,
            )
        },
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

    stored = document.file_path or ""

    # Legacy local file — use existing FileResponse logic.
    if is_legacy_local_path(stored):
        file_path = resolve_evidence_file(document)
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

    # Supabase Storage object — download bytes and stream.
    file_bytes = read_from_supabase(stored)
    return Response(
        content=file_bytes,
        media_type=_supabase_media_type(document, stored),
        headers={
            "Content-Disposition": _safe_content_disposition(
                _supabase_filename(document, stored),
                inline=False,
            )
        },
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

    new_stored_name = (
        f"{uuid4().hex}.{extension}"
    )

    # Read file content for size computation and storage upload.
    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Production safety check — do not silently fall back to local.
    if _is_production_environment() and not _storage_configured_for_production():
        raise HTTPException(
            status_code=500,
            detail="Supabase Storage is not configured for production.",
        )

    # Determine new storage key.
    if _s3_client is not None:
        new_key = f"evidence/{folder_name}/{new_stored_name}"
    else:
        if _is_production_environment():
            raise HTTPException(
                status_code=500,
                detail="Supabase Storage is not configured for production.",
            )
        # Legacy local fallback — permitted only in development.
        upload_dir = UPLOAD_ROOT / folder_name
        upload_dir.mkdir(parents=True, exist_ok=True)
        destination = upload_dir / new_stored_name
        with destination.open("wb") as buffer:
            buffer.write(file_bytes)
        new_key = f"/uploads/evidence/{folder_name}/{new_stored_name}"

    # 1. Upload new object to Supabase Storage (if configured).
    if _s3_client is not None:
        try:
            upload_to_supabase(BytesIO(file_bytes), new_key)
        except HTTPException:
            raise

    # 2. Update database reference (Document + new DocumentVersion).
    #    If this fails, clean up the newly uploaded Supabase object.
    try:
        updated_document = replace_document_file(
            db=db,
            user=current_user,
            document_id=document_id,
            file_path=new_key,
            file_type=(
                file.content_type
                or extension
            ),
            file_size=file_size,
        )
    except Exception:
        # DB update failed — attempt to clean up the newly uploaded
        # Supabase object without touching the old file.
        if _s3_client is not None:
            delete_from_supabase(new_key)
        raise

    # 3. DB update succeeded. Do NOT delete the old Supabase object,
    #    because historical DocumentVersion records may still reference it.
    #    (The old key remains in the bucket; only the Document's file_path
    #     and the current DocumentVersion point to the new key.)

    return updated_document
