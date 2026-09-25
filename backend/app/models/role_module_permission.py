from sqlalchemy import Column, Integer, Boolean, ForeignKey
from app.db.database import Base


class RoleModulePermission(Base):
    __tablename__ = "role_module_permissions"

    id = Column(Integer, primary_key=True, index=True)

    role_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=False
    )

    module_id = Column(
        Integer,
        ForeignKey("modules.id"),
        nullable=False
    )

    permission_id = Column(
        Integer,
        ForeignKey("permissions.id"),
        nullable=False
    )

    allowed = Column(
        Boolean,
        default=True,
        nullable=False
    )