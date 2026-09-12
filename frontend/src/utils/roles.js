export const APP_HOME = '/app/dashboard';

export const ROLES = {
  ADMIN: 'ADMIN',
  IQAC_COORDINATOR: 'IQAC_COORDINATOR',
  CRITERION_INCHARGE: 'CRITERION_INCHARGE',
  DEPARTMENT_CONTRIBUTOR: 'DEPARTMENT_CONTRIBUTOR',
  FACULTY: 'FACULTY',
  REVIEWER: 'REVIEWER',
  FINAL_APPROVER: 'FINAL_APPROVER',
};

export const SELF_REGISTERABLE_ROLES = [
  ROLES.DEPARTMENT_CONTRIBUTOR,
  ROLES.FACULTY,
];

export const ROLE_PRIORITY = [
  ROLES.ADMIN,
  ROLES.IQAC_COORDINATOR,
  ROLES.FINAL_APPROVER,
  ROLES.CRITERION_INCHARGE,
  ROLES.REVIEWER,
  ROLES.DEPARTMENT_CONTRIBUTOR,
  ROLES.FACULTY,
];

export const ROLE_META = {
  [ROLES.ADMIN]: {
    label: 'Administrator',
    shortLabel: 'Admin',
    accent: '#2563EB',
    tagline: 'Institution-wide control and user provisioning',
  },
  [ROLES.IQAC_COORDINATOR]: {
    label: 'NAAC Coordinator (IQAC)',
    shortLabel: 'IQAC',
    accent: '#0EA5E9',
    tagline: 'Coordinate accreditation across all criteria',
  },
  [ROLES.CRITERION_INCHARGE]: {
    label: 'Criterion In-charge',
    shortLabel: 'Criterion',
    accent: '#16A34A',
    tagline: 'Own criterion evidence and key indicators',
  },
  [ROLES.DEPARTMENT_CONTRIBUTOR]: {
    label: 'Department Contributor',
    shortLabel: 'Contributor',
    accent: '#F59E0B',
    tagline: 'Upload and maintain department evidence',
  },
  [ROLES.FACULTY]: {
    label: 'Faculty',
    shortLabel: 'Faculty',
    accent: '#8B5E3C',
    tagline: 'Faculty contributions to accreditation data',
  },
  [ROLES.REVIEWER]: {
    label: 'Reviewer',
    shortLabel: 'Reviewer',
    accent: '#7C3AED',
    tagline: 'Quality review of submitted evidence',
  },
  [ROLES.FINAL_APPROVER]: {
    label: 'Final Approver',
    shortLabel: 'Approver',
    accent: '#DC2626',
    tagline: 'Final institutional sign-off before submission',
  },
};

export function normalizeRoles(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return [];
  return roles.map((role) => (typeof role === 'string' ? role : role?.role)).filter(Boolean);
}

export function getPrimaryRole(roles) {
  const normalized = normalizeRoles(roles);
  return ROLE_PRIORITY.find((role) => normalized.includes(role)) || normalized[0] || null;
}

export function getRolePath() {
  return APP_HOME;
}

export function getRoleLabel(role) {
  return ROLE_META[role]?.label || role;
}

export function hasAnyRole(userRoles, allowedRoles) {
  if (!allowedRoles?.length) return true;
  const set = new Set(userRoles || []);
  return allowedRoles.some((r) => set.has(r));
}
