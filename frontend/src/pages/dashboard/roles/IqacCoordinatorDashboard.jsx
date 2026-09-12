import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Grid, LinearProgress, Stack } from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import { fetchCoordinatorDashboard } from '../../../api/coordinator';
import { getApiErrorMessage } from '../../../utils/naacMappers';
import DashboardPageHeader from '../../../components/dashboard/roles/iqac/DashboardPageHeader';
import WelcomeBanner from '../../../components/dashboard/roles/iqac/WelcomeBanner';
import CoordinatorStatCards from '../../../components/dashboard/roles/iqac/CoordinatorStatCards';
import CriteriaProgressList from '../../../components/dashboard/roles/iqac/CriteriaProgressList';
import AttentionPanel from '../../../components/dashboard/roles/iqac/AttentionPanel';
import RecentSubmissionsPanel from '../../../components/dashboard/roles/iqac/RecentSubmissionsPanel';

/**
 * Dedicated dashboard layout for NAAC Coordinator (IQAC_COORDINATOR).
 * Other roles keep DefaultDashboard until their layouts are added.
 */
export default function IqacCoordinatorDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCoordinatorDashboard();
      setDashboard(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load coordinator dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const urgentCount = useMemo(() => {
    if (!dashboard?.attentionItems) return 0;
    return dashboard.attentionItems.filter(
      (item) => item.status === 'Critical' || item.status === 'Needs Attention',
    ).length;
  }, [dashboard]);

  if (loading && !dashboard) {
    return (
      <Stack spacing={2.5}>
        <DashboardPageHeader />
        <LinearProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <DashboardPageHeader />
      {error ? (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}
      {dashboard ? (
        <>
          <WelcomeBanner institution={dashboard.institution} userName={user?.name} />
          <CoordinatorStatCards stats={dashboard.stats} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <CriteriaProgressList items={dashboard.criteriaProgress} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2}>
                <AttentionPanel items={dashboard.attentionItems} urgentCount={urgentCount} />
                <RecentSubmissionsPanel items={dashboard.recentSubmissions} />
              </Stack>
            </Grid>
          </Grid>
        </>
      ) : null}
    </Stack>
  );
}
