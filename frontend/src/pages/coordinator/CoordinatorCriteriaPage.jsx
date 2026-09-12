import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, LinearProgress, MenuItem, Stack, TextField } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { listCriteria } from '../../api/criteria';
import { getApiErrorMessage } from '../../utils/naacMappers';
import CoordPageHeader from '../../components/coordinator/shared/CoordPageHeader';
import CoordStatRow from '../../components/coordinator/shared/CoordStatRow';
import CoordFilterBar from '../../components/coordinator/shared/CoordFilterBar';
import CriteriaMonitorGrid from '../../components/coordinator/criteria/CriteriaMonitorGrid';

export default function CoordinatorCriteriaPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [stats, setStats] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listCriteria();
      setStats(data.stats);
      setCards(data.items);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load criteria.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    return cards.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q);
      const matchStatus = status === 'all' || item.status === status;
      return matchSearch && matchStatus;
    });
  }, [cards, search, status]);

  return (
    <Box>
      <CoordPageHeader
        title="NAAC Criteria"
        subtitle="Monitor institutional progress across all 7 NAAC criteria."
        action={
          <Stack direction="row" spacing={1}>
            <TextField select size="small" defaultValue="2025-26" sx={{ minWidth: 160 }}>
              <MenuItem value="2025-26">Academic Year: 2025-26</MenuItem>
              <MenuItem value="2024-25">Academic Year: 2024-25</MenuItem>
            </TextField>
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />}>
              Export Criteria Status
            </Button>
          </Stack>
        }
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
        searchPlaceholder="Search criteria title..."
        filters={[
          {
            id: 'status',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'Completed', label: 'Completed' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Needs Attention', label: 'Needs Attention' },
            ],
          },
        ]}
        onReset={() => {
          setSearch('');
          setStatus('all');
        }}
      />

      <CriteriaMonitorGrid items={items} />
    </Box>
  );
}
