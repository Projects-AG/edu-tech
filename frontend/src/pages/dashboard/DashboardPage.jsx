import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';
import DefaultDashboard from './DefaultDashboard';
import IqacCoordinatorDashboard from './roles/IqacCoordinatorDashboard';

/**
 * Thin role router — add new role dashboards here as they are built.
 * Falls back to DefaultDashboard for roles without a dedicated layout.
 */
const ROLE_DASHBOARDS = {
  [ROLES.IQAC_COORDINATOR]: IqacCoordinatorDashboard,
};

export default function DashboardPage() {
  const { activeRole } = useAuth();
  const View = ROLE_DASHBOARDS[activeRole] ?? DefaultDashboard;
  return <View />;
}
