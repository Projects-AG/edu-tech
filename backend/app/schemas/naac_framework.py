from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.naac_framework_catalog import normalize_official_category


class FrameworkCriterionResponse(BaseModel):
    id: int
    number: str
    title: str
    description: str | None = None
    display_order: int

    model_config = ConfigDict(from_attributes=True)


class NaacFrameworkResponse(BaseModel):
    id: int
    code: str
    name: str
    version: str
    pathway_type: str
    institution_category: str
    programme_level: str | None = None
    source_title: str | None = None
    source_url: str | None = None
    issuing_authority: str | None = None
    publication_date: date | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    verification_status: str
    status: str
    allows_production_cycles: bool
    criterion_structure_verified: bool = False
    metric_catalogue_complete: bool = False
    metric_row_count: int = 0
    metric_rules_verified: bool = False
    confirmable: bool = False
    catalogue_status: str | None = None
    uses_seven_criteria: bool
    official_criterion_count: int | None = None
    official_metric_count: int | None = None
    official_metric_count_note: str | None = None
    notes: str | None = None
    recorded_programme_level: str | None = None
    criteria: list[FrameworkCriterionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class FrameworkRecommendationRequest(BaseModel):
    official_category: str | None = None
    affiliation_status: str | None = None
    affiliated_university: str | None = None
    autonomous_status: str | None = None
    is_constituent_unit: bool | None = None
    parent_institution_name: str | None = None
    programme_level: str | None = None
    existing_naac_status: str | None = None
    previous_cycle_number: str | None = None
    application_pathway: str | None = None

    @field_validator("official_category", mode="before")
    @classmethod
    def validate_official_category(cls, value):
        return normalize_official_category(value)


class FrameworkRecommendationResponse(BaseModel):
    recommendation_status: str
    recommended_framework_id: int | None = None
    recommended_framework: NaacFrameworkResponse | None = None
    recommendation_reason: str
    allows_production_cycles: bool = False
    criterion_structure_verified: bool = False
    metric_catalogue_complete: bool = False
    metric_rules_verified: bool = False
    catalogue_status: str | None = None


class InstitutionCategoryOption(BaseModel):
    code: str
    label: str
    description: str
