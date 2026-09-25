from pydantic import BaseModel, Field


class RegistrationApprovalRequest(BaseModel):
    role_id: int

    institution_id: int | None = None

    faculty_id: int | None = None

    department_id: int | None = None


class RegistrationRejectionRequest(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=500
    )