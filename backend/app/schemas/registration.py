from pydantic import BaseModel, EmailStr, Field


class RegistrationRequestCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr

    institution: str = Field(min_length=2, max_length=250)
    institution_id: int

    department: str = Field(min_length=2, max_length=150)
    department_id: int

    # Role requested by the user during registration
    role_id: int

    designation: str = Field(min_length=2, max_length=150)

    password: str = Field(min_length=8, max_length=128)


class RegistrationRequestResponse(BaseModel):
    message: str
    request_id: int
    status: str