import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, LinearProgress } from '@mui/material';
import { fetchCoordinatorDepartments } from '../../api/coordinator';
import { getApiErrorMessage } from '../../utils/naacMappers';
import CoordPageHeader from '../../components/coordinator/shared/CoordPageHeader';
import CoordStatRow from '../../components/coordinator/shared/CoordStatRow';
import CoordFilterBar from '../../components/coordinator/shared/CoordFilterBar';
import DepartmentsBoard from '../../components/coordinator/departments/DepartmentsBoard';

export default function CoordinatorDepartmentsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [stats, setStats] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCoordinatorDepartments();
      setStats(data.stats);
      setDepartments(data.departments);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load departments.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return departments.filter((dept) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        dept.name.toLowerCase().includes(q) ||
        dept.coordinator.toLowerCase().includes(q) ||
        dept.code.toLowerCase().includes(q);
      const matchStatus = status === 'all' || dept.status === status;
      return matchSearch && matchStatus;
    });
  }, [departments, search, status]);

  return (
    <Box>
      <CoordPageHeader
        title="Departments"
        subtitle="Monitor department-wise NAAC progress, evidence, and submission status."
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}
      {loading ? <LinearProgress sx={{ mb: 2 }} /> : null}
      <CoordStatRow stats={stats} />
      <CoordFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search department or coordinator..."
        filters={[
          {
            id: 'status',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'On Track', label: 'On Track' },
              { value: 'Needs Attention', label: 'Needs Attention' },
              { value: 'Completed', label: 'Completed' },
            ],
          },
        ]}
        onReset={() => {
          setSearch('');
          setStatus('all');
        }}
      />
      <DepartmentsBoard departments={filtered} />
    </Box>
  );
}
