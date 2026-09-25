from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.module import Module
from app.models.role_module_permission import RoleModulePermission
from app.models.institution import Institution
from app.models.accreditation_cycle import AccreditationCycle
from app.models.department import Department
from app.models.criterion import Criterion
from app.models.submission import Submission
from app.models.document import Document
from app.models.review import Review
from app.models.notification import Notification
from app.models.registration_request import RegistrationRequest
from app.models.faculty import Faculty
from app.models.institution_request import InstitutionRequest
from app.models.document_version import DocumentVersion

# NAAC structure
from app.models.section import Section
from app.models.metric import Metric
from app.models.evidence_requirement import EvidenceRequirement


__all__ = [
    "User",
    "Role",
    "Permission",
    "Module",
    "RoleModulePermission",
    "Institution",
    "AccreditationCycle",
    "Department",
    "Criterion",
    "Submission",
    "Document",
    "Review",
    "Notification",
    "RegistrationRequest",
    "Faculty",
    "InstitutionRequest",
    "Section",
    "Metric",
    "EvidenceRequirement",
]