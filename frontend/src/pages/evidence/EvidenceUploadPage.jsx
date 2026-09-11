import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ModuleCard from '../../components/common/ModuleCard';
import { uploadFile } from '../../api/platform';
import { CRITERIA } from '../../data/mock/criteria';

const metricOptions = CRITERIA.flatMap((c) =>
  (c.indicators || []).flatMap((ki) =>
    (ki.metrics || []).map((m) => ({
      id: m.id,
      label: `${c.code} · ${m.code} · ${m.name}`,
    })),
  ),
);

export default function EvidenceUploadPage() {
  const [metricId, setMetricId] = useState(metricOptions[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!file) {
      setError('Please choose a file.');
      return;
    }
    setLoading(true);
    try {
      const result = await uploadFile(file);
      setMessage(`Uploaded ${result.file_name} (${result.size_bytes} bytes). Link to metric saved locally for now.`);
      setFile(null);
      setNotes('');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Upload failed. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Upload Evidence"
        subtitle="Attach documents to a metric with metadata"
        crumbs={[
          { label: 'Evidence', to: '/app/evidence' },
          { label: 'Upload' },
        ]}
        action={
          <Button component={RouterLink} to="/app/evidence" variant="outlined">
            Back to library
          </Button>
        }
      />

      <ModuleCard sx={{ maxWidth: 640 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField select label="Link to metric" value={metricId} onChange={(e) => setMetricId(e.target.value)}>
              {metricOptions.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" component="label">
              {file ? file.name : 'Choose file'}
              <input
                hidden
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Button>
            <TextField
              label="Notes / metadata"
              multiline
              minRows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Typography variant="caption" color="text.secondary">
              Status flow: Draft → Submitted → Under Review → Approved / Rejected
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {message ? <Alert severity="success">{message}</Alert> : null}
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Uploading…' : 'Upload & submit'}
            </Button>
          </Stack>
        </Box>
      </ModuleCard>
    </Box>
  );
}
