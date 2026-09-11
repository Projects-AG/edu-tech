import hashlib
import os
import uuid

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.deps import get_current_user
from app.models.models import FileUpload, User, AuditLog

router = APIRouter(prefix="/files", tags=["files"])

# Local dev storage; replace with boto3 upload_fileobj() against
# settings.storage_endpoint / storage_bucket for S3 / R2 / MinIO in prod.
LOCAL_STORAGE_DIR = "storage/uploads"
os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)


@router.post("/upload")
async def upload_file(
    upload: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contents = await upload.read()
    checksum = hashlib.sha256(contents).hexdigest()
    storage_key = f"{uuid.uuid4()}_{upload.filename}"

    with open(os.path.join(LOCAL_STORAGE_DIR, storage_key), "wb") as f:
        f.write(contents)

    file_record = FileUpload(
        institution_id=current_user.institution_id,
        uploaded_by_id=current_user.id,
        file_name=upload.filename,
        storage_key=storage_key,
        mime_type=upload.content_type or "application/octet-stream",
        size_bytes=len(contents),
        checksum=checksum,
    )
    db.add(file_record)
    db.add(
        AuditLog(
            institution_id=current_user.institution_id,
            actor_id=current_user.id,
            action="FILE_UPLOAD",
            entity_type="FileUpload",
            entity_id=None,
        )
    )
    db.commit()
    db.refresh(file_record)

    return {
        "id": file_record.id,
        "file_name": file_record.file_name,
        "size_bytes": file_record.size_bytes,
        "checksum": file_record.checksum,
    }
