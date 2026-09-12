import { ROLES } from '../utils/roles';

const ALL = Object.values(ROLES);

/**
 * Default navigation for most roles.
 * IQAC Coordinator uses COORDINATOR_NAV instead (see getNavItems).
 */
export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: 'Dashboard',
    roles: ALL,
  },
  {
    id: 'criteria',
    label: 'NAAC Criteria',
    path: '/app/criteria',
    icon: 'FactCheck',
    roles: ALL,
  },
  {
    id: 'evidence',
    label: 'Evidence & Documents',
    path: '/app/evidence',
    icon: 'FolderOpen',
    roles: ALL,
  },
  {
    id: 'data-entry',
    label: 'Data Entry',
    path: '/app/data-entry',
    icon: 'EditNote',
    roles: [
      ROLES.IQAC_COORDINATOR,
      ROLES.CRITERION_INCHARGE,
      ROLES.DEPARTMENT_CONTRIBUTOR,
      ROLES.FACULTY,
      ROLES.ADMIN,
    ],
  },
  {
    id: 'tasks',
    label: 'Task Management',
    path: '/app/tasks',
    icon: 'TaskAlt',
    roles: ALL,
  },
  {
    id: 'reviews',
    label: 'Review & Approvals',
    path: '/app/reviews',
    icon: 'RateReview',
    roles: [
      ROLES.ADMIN,
      ROLES.IQAC_COORDINATOR,
      ROLES.CRITERION_INCHARGE,
      ROLES.REVIEWER,
      ROLES.FINAL_APPROVER,
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/app/reports',
    icon: 'Assessment',
    roles: [
      ROLES.ADMIN,
      ROLES.IQAC_COORDINATOR,
      ROLES.CRITERION_INCHARGE,
      ROLES.FINAL_APPROVER,
      ROLES.REVIEWER,
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/app/notifications',
    icon: 'Notifications',
    roles: ALL,
    badgeKey: 'notifications',
  },
  {
    id: 'departments',
    label: 'Departments',
    path: '/app/departments',
    icon: 'Apartment',
    roles: [
      ROLES.ADMIN,
      ROLES.IQAC_COORDINATOR,
      ROLES.CRITERION_INCHARGE,
      ROLES.FINAL_APPROVER,
    ],
  },
  {
    id: 'users',
    label: 'User Management',
    path: '/app/users',
    icon: 'ManageAccounts',
    roles: [ROLES.ADMIN, ROLES.IQAC_COORDINATOR],
  },
  {
    id: 'audit',
    label: 'Audit Log',
    path: '/app/audit',
    icon: 'History',
    roles: [ROLES.ADMIN, ROLES.IQAC_COORDINATOR],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/app/settings',
    icon: 'Settings',
    roles: ALL,
  },
];

/** Sidebar items matching NAAC Coordinator mockups */
export const COORDINATOR_NAV = [
  { id: 'dashboard', label: 'Dashboard', path: '/app/dashboard', icon: 'Dashboard' },
  { id: 'criteria', label: 'NAAC Criteria', path: '/app/criteria', icon: 'FactCheck', badge: '7' },
  { id: 'departments', label: 'Departments', path: '/app/departments', icon: 'Apartment', badge: '12' },
  {
    id: 'evidence',
    label: 'Documents & Evidence',
    path: '/app/evidence',
    icon: 'FolderOpen',
    badge: '248',
  },
  {
    id: 'submissions',
    label: 'Submissions',
    path: '/app/submissions',
    icon: 'Inbox',
    badge: '24 new',
    badgeTone: 'success',
  },
  {
    id: 'reviews',
    label: 'Review & Approval',
    path: '/app/reviews',
    icon: 'RateReview',
    badge: '18',
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    path: '/app/reports',
    icon: 'Assessment',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/app/notifications',
    icon: 'Notifications',
    showDot: true,
  },
  { id: 'profile', label: 'Profile', path: '/app/settings', icon: 'Person' },
];

export const COORDINATOR_CYCLE = {
  title: 'CYCLE 3',
  year: '2026–27',
  status: 'SSR In Progress',
};

export function getNavForRoles(userRoles = []) {
  const set = new Set(userRoles);
  return NAV_ITEMS.filter((item) => item.roles.some((r) => set.has(r)));
}

/** Prefer activeRole so coordinator gets a dedicated sidebar. */
export function getNavItems(userRoles = [], activeRole = null) {
  if (activeRole === ROLES.IQAC_COORDINATOR) return COORDINATOR_NAV;
  return getNavForRoles(userRoles);
}

export const ACTION_CENTER = [
  {
    id: 'upload',
    title: 'Upload Evidence',
    description: 'Add documents for metrics',
    path: '/app/evidence/upload',
    icon: 'CloudUpload',
    roles: [
      ROLES.IQAC_COORDINATOR,
      ROLES.CRITERION_INCHARGE,
      ROLES.DEPARTMENT_CONTRIBUTOR,
      ROLES.FACULTY,
      ROLES.ADMIN,
    ],
  },
  {
    id: 'data',
    title: 'Provide Data',
    description: 'Fill quantitative metrics',
    path: '/app/data-entry',
    icon: 'EditNote',
    roles: [
      ROLES.IQAC_COORDINATOR,
      ROLES.CRITERION_INCHARGE,
      ROLES.DEPARTMENT_CONTRIBUTOR,
      ROLES.FACULTY,
      ROLES.ADMIN,
    ],
  },
  {
    id: 'pending',
    title: 'View Pending',
    description: 'See items pending with me',
    path: '/app/tasks',
    icon: 'HourglassTop',
    roles: ALL,
  },
  {
    id: 'review',
    title: 'Review & Approve',
    description: 'Review evidence & approve',
    path: '/app/reviews',
    icon: 'RateReview',
    roles: [
      ROLES.IQAC_COORDINATOR,
      ROLES.CRITERION_INCHARGE,
      ROLES.REVIEWER,
      ROLES.FINAL_APPROVER,
      ROLES.ADMIN,
    ],
  },
  {
    id: 'reports',
    title: 'Generate Reports',
    description: 'SSR, AQAR, DVV & custom reports',
    path: '/app/reports',
    icon: 'Assessment',
    roles: [
      ROLES.ADMIN,
      ROLES.IQAC_COORDINATOR,
      ROLES.CRITERION_INCHARGE,
      ROLES.FINAL_APPROVER,
    ],
  },
];

export function getActionsForRoles(userRoles = []) {
  const set = new Set(userRoles);
  return ACTION_CENTER.filter((item) => item.roles.some((r) => set.has(r)));
}
