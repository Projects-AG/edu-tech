import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { listReviewQueue } from '../../api/reviews';
import { getApiErrorMessage } from '../../utils/naacMappers';
import CoordPageHeader from '../../components/coordinator/shared/CoordPageHeader';
import CoordStatRow from '../../components/coordinator/shared/CoordStatRow';
import CoordFilterBar from '../../components/coordinator/shared/CoordFilterBar';
import ReviewsBoard from '../../components/coordinator/reviews/ReviewsBoard';

export default function CoordinatorReviewsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [stats, setStats] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listReviewQueue({
        status,
        q: search.trim() || undefined,
      });
      setStats(data.stats);
      setQueue(data.queue);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load review queue.'));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <Box>
      <CoordPageHeader
        title="Review & Approval"
        subtitle="Review statutory submissions, track approvals, and manage items requiring immediate action."
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Academic Year: 2025-26
            </Typography>
            <Button variant="outlined" startIcon={<DescriptionOutlinedIcon />}>
              View Approval Rules
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
        searchPlaceholder="Search metric, keyword..."
        filters={[
          {
            id: 'status',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Under Review', label: 'Under Review' },
              { value: 'Needs Correction', label: 'Needs Correction' },
              { value: 'Needs Attention', label: 'Needs Attention' },
              { value: 'Approved', label: 'Approved' },
            ],
          },
        ]}
        onReset={() => {
          setSearch('');
          setStatus('all');
        }}
        action={
          <Button variant="contained" startIcon={<DescriptionOutlinedIcon />}>
            Export Queue
          </Button>
        }
      />
      <ReviewsBoard queue={queue} />
    </Box>
  );
}
