import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, LinearProgress } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { listEvidence } from '../../api/evidence';
import { getApiErrorMessage } from '../../utils/naacMappers';
import CoordPageHeader from '../../components/coordinator/shared/CoordPageHeader';
import CoordStatRow from '../../components/coordinator/shared/CoordStatRow';
import CoordFilterBar from '../../components/coordinator/shared/CoordFilterBar';
import DocumentsRegistry from '../../components/coordinator/documents/DocumentsRegistry';

export default function CoordinatorDocumentsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [stats, setStats] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listEvidence({
        status,
        q: search.trim() || undefined,
      });
      setStats(data.stats);
      setDocuments(data.documents);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load evidence registry.'));
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
        title="Documents & Evidence"
        subtitle="Manage, organize and track evidence required for NAAC accreditation."
        badge="Institutional Repository"
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
        searchPlaceholder="Search file name..."
        filters={[
          {
            id: 'status',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'Verified', label: 'Verified' },
              { value: 'Pending Review', label: 'Pending Review' },
              { value: 'Needs Correction', label: 'Needs Correction' },
            ],
          },
        ]}
        onReset={() => {
          setSearch('');
          setStatus('all');
        }}
        action={
          <Button variant="contained" startIcon={<FileDownloadOutlinedIcon />}>
            Export Registry
          </Button>
        }
      />
      <DocumentsRegistry documents={documents} />
    </Box>
  );
}
