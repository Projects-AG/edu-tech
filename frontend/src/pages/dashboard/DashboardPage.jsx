import { Stack, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { getActionsForRoles } from '../../config/navigation';
import { CRITERIA } from '../../data/mock/criteria';
import { DASHBOARD_KPIS, QUICK_REPORTS, RECENT_ACTIVITY } from '../../data/mock/modules';
import { ROLE_META } from '../../utils/roles';
import DashboardKpis from '../../components/dashboard/DashboardKpis';
import CriteriaCardsGrid from '../../components/dashboard/CriteriaCardsGrid';
import ActionCenter from '../../components/dashboard/ActionCenter';
import ActivityFeed, { QuickReportsList } from '../../components/dashboard/ActivityAndReports';
import { Grid } from '@mui/material';

export default function DashboardPage() {
  const { user, roles, activeRole } = useAuth();
  const actions = getActionsForRoles(roles);
  const roleLabel = ROLE_META[activeRole]?.label || 'User';

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1.2}>
          Role-based access · Easy data entry · Evidence upload · Progress tracking · Reports
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.45rem', md: '1.85rem' } }}>
          Welcome, {user?.name?.split(' ')[0] || 'User'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {roleLabel} workspace · NAAC Cycle IV (2024–2025)
        </Typography>
      </Stack>

      <DashboardKpis kpis={DASHBOARD_KPIS} />
      <CriteriaCardsGrid criteria={CRITERIA} />
      <ActionCenter actions={actions} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ActivityFeed items={RECENT_ACTIVITY} />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <QuickReportsList items={QUICK_REPORTS} />
        </Grid>
      </Grid>
    </Stack>
  );
}
