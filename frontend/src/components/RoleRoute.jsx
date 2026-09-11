import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_HOME, hasAnyRole } from '../utils/roles';

/** Restrict a route tree to users who have at least one of the allowed roles */
export default function RoleRoute({ allowedRoles }) {
  const { roles } = useAuth();

  if (!hasAnyRole(roles, allowedRoles)) {
    return <Navigate to={APP_HOME} replace />;
  }

  return <Outlet />;
}
