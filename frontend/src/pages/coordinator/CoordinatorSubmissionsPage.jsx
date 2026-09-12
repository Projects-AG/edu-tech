import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { listSubmissions } from '../../api/submissions';
import { getApiErrorMessage } from '../../utils/naacMappers';
import CoordPageHeader from '../../components/coordinator/shared/CoordPageHeader';
import CoordStatRow from '../../components/coordinator/shared/CoordStatRow';
import CoordFilterBar from '../../components/coordinator/shared/CoordFilterBar';
import SubmissionsBoard from '../../components/coordinator/submissions/SubmissionsBoard';

export default function CoordinatorSubmissionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [stats, setStats] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSubmissions({
        status,
        q: search.trim() || undefined,
      });
      setStats(data.stats);
      setSubmissions(data.submissions);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load submissions.'));
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
        title="NAAC Submissions"
        subtitle="Track institutional NAAC submissions and monitor their approval status across cycles."
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />}>
              Export Registry
            </Button>
            <Button variant="contained" startIcon={<AddIcon />}>
              Create Submission
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
        searchPlaceholder="Search submissions..."
        filters={[
          {
            id: 'status',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Under Review', label: 'Under Review' },
              { value: 'Needs Correction', label: 'Needs Correction' },
              { value: 'Submitted', label: 'Submitted' },
            ],
          },
        ]}
        onReset={() => {
          setSearch('');
          setStatus('all');
        }}
      />
      <SubmissionsBoard submissions={submissions} />
    </Box>
  );
}
