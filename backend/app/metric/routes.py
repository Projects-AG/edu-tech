from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.auth.dependencies import (
    get_db,
    get_current_user,
    require_permission
)

from app.models import AccreditationCycle, Metric, Section, User
from app.models.metric import CATALOG_KIND_OFFICIAL, CATALOG_KIND_WORKING
from app.accreditation.routes import ensure_cycle_institution_access
from app.services.framework_service import cycle_metric_catalog

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
    catalog_kind: str | None = CATALOG_KIND_WORKING,
    cycle_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if cycle_id is not None:
        cycle = (
            db.query(AccreditationCycle)
            .filter(AccreditationCycle.id == cycle_id)
            .first()
        )
        if not cycle:
            raise HTTPException(
                status_code=404,
                detail="Accreditation cycle not found",
            )
        ensure_cycle_institution_access(db, current_user, cycle)
        _catalog_kind, metrics = cycle_metric_catalog(db, cycle)
        if section_id is not None:
            metrics = [
                item for item in metrics if item.section_id == section_id
            ]
        return metrics

    query = db.query(Metric)

    if catalog_kind:
        query = query.filter(
            Metric.catalog_kind == catalog_kind
        )

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
    cycle_id: int | None = None,
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

    if metric.catalog_kind == CATALOG_KIND_OFFICIAL:
        if cycle_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Official operational metrics must be requested with "
                    "cycle_id. They are not part of the working catalogue."
                ),
            )
        cycle = (
            db.query(AccreditationCycle)
            .filter(AccreditationCycle.id == cycle_id)
            .first()
        )
        if not cycle:
            raise HTTPException(
                status_code=404,
                detail="Accreditation cycle not found",
            )
        ensure_cycle_institution_access(db, current_user, cycle)
        if (
            not cycle.framework_id
            or metric.framework_id != cycle.framework_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Official metric does not belong to this cycle's "
                    "framework. Working-catalogue metrics are not used "
                    "as a substitute."
                ),
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
        display_order=metric_data.display_order,
        catalog_kind=CATALOG_KIND_WORKING,
        framework_id=None,
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
        require_permission("CRITERIA_1", "Edit")
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