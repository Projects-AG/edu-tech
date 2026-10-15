
import os

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegistrationRequestCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str

    institution: str = Field(min_length=2, max_length=250)
    institution_id: int

    department: str = Field(min_length=2, max_length=150)
    department_id: int

    # Role requested by the user during registration
    role_id: int

    designation: str = Field(min_length=2, max_length=150)

    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_registration_email(cls, value: str) -> str:
        value = value.strip()
        environment = os.getenv("ENVIRONMENT", "development").strip().lower()

        # Allow demo emails only outside production.
        if environment not in {"production", "prod"}:
            if value.lower().endswith("@evdemo.test"):
                local_part = value.rsplit("@", 1)[0]
                if local_part and " " not in local_part:
                    return value

        # Validate all other email addresses normally.
        from pydantic import TypeAdapter

        return str(TypeAdapter(EmailStr).validate_python(value))


class RegistrationRequestResponse(BaseModel):
    message: str
    request_id: int
    status: str
