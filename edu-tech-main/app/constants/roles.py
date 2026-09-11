from app.models.models import RoleName, ScopeType

SELF_REGISTERABLE_ROLES: frozenset[RoleName] = frozenset(
    {
        RoleName.DEPARTMENT_CONTRIBUTOR,
        RoleName.FACULTY,
    }
)

BOOTSTRAP_ONLY_ROLES: frozenset[RoleName] = frozenset({RoleName.ADMIN})

DEPARTMENT_SCOPED_ROLES: frozenset[RoleName] = frozenset(
    {
        RoleName.DEPARTMENT_CONTRIBUTOR,
        RoleName.FACULTY,
    }
)

INSTITUTION_SCOPED_ROLES: frozenset[RoleName] = frozenset(
    {
        RoleName.ADMIN,
        RoleName.IQAC_COORDINATOR,
        RoleName.CRITERION_INCHARGE,
        RoleName.FINAL_APPROVER,
    }
)

# REVIEWER may be institution- or department-scoped.


def allowed_roles_for_actor(actor_roles: set[RoleName]) -> set[RoleName]:
    """Roles an authenticated actor may assign via API. ADMIN cannot be created this way."""
    if RoleName.ADMIN in actor_roles:
        return set(RoleName) - set(BOOTSTRAP_ONLY_ROLES)
    if RoleName.IQAC_COORDINATOR in actor_roles:
        return {
            RoleName.CRITERION_INCHARGE,
            RoleName.REVIEWER,
            RoleName.DEPARTMENT_CONTRIBUTOR,
            RoleName.FACULTY,
        }
    return set()


def default_scope_for_role(role: RoleName, requested: ScopeType | None) -> ScopeType:
    if role in DEPARTMENT_SCOPED_ROLES:
        return ScopeType.DEPARTMENT
    if role in INSTITUTION_SCOPED_ROLES:
        return ScopeType.INSTITUTION
    return requested or ScopeType.INSTITUTION
