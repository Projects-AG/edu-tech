from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.auth.dependencies import (
    get_db,
    get_current_user,
    require_permission
)

from app.models import Metric, Section, User

from app.schemas.metric import (
    MetricCreate,
    MetricUpdate,
    MetricResponse
)


router = APIRouter(
    prefix="/metrics",
    tags=["NAAC Metrics"]
)


# ============================================================
# GET ALL METRICS
# ============================================================

@router.get("", response_model=List[MetricResponse])
def get_metrics(
    section_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    query = db.query(Metric)

    if section_id is not None:
        query = query.filter(
            Metric.section_id == section_id
        )

    return query.order_by(
        Metric.display_order.asc()
    ).all()


# ============================================================
# GET METRIC BY ID
# ============================================================

@router.get(
    "/{metric_id}",
    response_model=MetricResponse
)
def get_metric(
    metric_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    metric = db.query(Metric).filter(
        Metric.id == metric_id
    ).first()

    if not metric:
        raise HTTPException(
            status_code=404,
            detail="Metric not found"
        )

    return metric


# ============================================================
# CREATE METRIC
# ============================================================

@router.post(
    "",
    response_model=MetricResponse,
    status_code=status.HTTP_201_CREATED
)
def create_metric(
    metric_data: MetricCreate,
    current_user: User = Depends(
        require_permission("CRITERIA_1", "Create")
    ),
    db: Session = Depends(get_db)
):

    # Check section exists
    section = db.query(Section).filter(
        Section.id == metric_data.section_id
    ).first()

    if not section:
        raise HTTPException(
            status_code=404,
            detail="Section not found"
        )

    metric = Metric(
        section_id=metric_data.section_id,
        code=metric_data.code,
        title=metric_data.title,
        description=metric_data.description,
        metric_type=metric_data.metric_type,
        weightage=metric_data.weightage,
        max_score=metric_data.max_score,
        requires_evidence=metric_data.requires_evidence,
        display_order=metric_data.display_order
    )

    db.add(metric)
    db.commit()
    db.refresh(metric)

    return metric


# ============================================================
# UPDATE METRIC
# ============================================================

@router.put(
    "/{metric_id}",
    response_model=MetricResponse
)
def update_metric(
    metric_id: int,
    metric_data: MetricUpdate,
    current_user: User = Depends(
        require_permission("CRITERIA_1", "Update")
    ),
    db: Session = Depends(get_db)
):

    metric = db.query(Metric).filter(
        Metric.id == metric_id
    ).first()

    if not metric:
        raise HTTPException(
            status_code=404,
            detail="Metric not found"
        )

    update_data = metric_data.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():
        setattr(metric, key, value)

    db.commit()
    db.refresh(metric)

    return metric


# ============================================================
# DELETE METRIC
# ============================================================

@router.delete("/{metric_id}")
def delete_metric(
    metric_id: int,
    current_user: User = Depends(
        require_permission("CRITERIA_1", "Delete")
    ),
    db: Session = Depends(get_db)
):

    metric = db.query(Metric).filter(
        Metric.id == metric_id
    ).first()

    if not metric:
        raise HTTPException(
            status_code=404,
            detail="Metric not found"
        )

    db.delete(metric)
    db.commit()

    return {
        "message": "Metric deleted successfully"
    }