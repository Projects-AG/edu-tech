import { ROLES } from '../utils/roles';

/** Dummy token so ProtectedRoute treats mock sessions as authenticated. */
export const MOCK_ACCESS_TOKEN = 'mock_access_token';
export const MOCK_REFRESH_TOKEN = 'mock_refresh_token';

/**
 * Hardcoded demo users for frontend role-dashboard work.
 * Auth developer can disable with VITE_USE_MOCK_AUTH=false.
 */
export const MOCK_USERS = [
  {
    email: 'coordinator@eduverse.in',
    password: 'demo1234',
    user: {
      id: 1,
      name: 'Prof. K. R. Sharma',
      email: 'coordinator@eduverse.in',
      institution_id: 1,
      department_id: null,
      is_active: true,
    },
    roles: [ROLES.IQAC_COORDINATOR],
  },
  {
    email: 'admin@example.com',
    password: 'ChangeMe123!',
    user: {
      id: 2,
      name: 'System Admin',
      email: 'admin@example.com',
      institution_id: 1,
      department_id: null,
      is_active: true,
    },
    roles: [ROLES.ADMIN],
  },
  {
    email: 'faculty@eduverse.in',
    password: 'demo1234',
    user: {
      id: 3,
      name: 'Dr. Priya Sharma',
      email: 'faculty@eduverse.in',
      institution_id: 1,
      department_id: 2,
      is_active: true,
    },
    roles: [ROLES.FACULTY],
  },
];

export function isMockAuthEnabled() {
  return import.meta.env.VITE_USE_MOCK_AUTH !== 'false';
}

export function isMockToken(token) {
  return token === MOCK_ACCESS_TOKEN;
}

export function findMockUser(email, password) {
  const normalized = email?.trim().toLowerCase();
  return MOCK_USERS.find(
    (entry) => entry.email.toLowerCase() === normalized && entry.password === password,
  );
}

export function buildMockLoginResponse(entry) {
  return {
    access_token: MOCK_ACCESS_TOKEN,
    refresh_token: MOCK_REFRESH_TOKEN,
    user: entry.user,
    roles: entry.roles,
  };
}
