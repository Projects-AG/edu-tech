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
import { CRITERIA, getMetric } from '../../data/mock/criteria';

const metricOptions = CRITERIA.flatMap((c) =>
  (c.indicators || []).flatMap((ki) =>
    (ki.metrics || []).map((m) => ({ id: m.id, label: `${m.code} · ${m.name}` })),
  ),
);

export default function DataEntryPage() {
  const [metricId, setMetricId] = useState(metricOptions[0]?.id || '');
  const found = getMetric(metricId);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const fields = found?.metric.fields || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    for (const field of fields) {
      const v = values[field.key] ?? field.value;
      if (v === '' || v === undefined || v === null) {
        setError(`${field.label} is required.`);
        return;
      }
      if (field.type === 'number' && Number(v) < 0) {
        setError(`${field.label} must be ≥ 0.`);
        return;
      }
    }
    setOk('Validated and saved as draft. Backend metrics API will persist this later.');
  };

  return (
    <Box>
      <PageHeader
        title="Data Entry"
        subtitle="Fill quantitative metrics with validation before submit"
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Data Entry' }]}
      />

      <Stack spacing={2}>
        <ModuleCard>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField select label="Select metric" value={metricId} onChange={(e) => setMetricId(e.target.value)} sx={{ minWidth: 280 }}>
              {metricOptions.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" disabled>
              Pull from SIS / Exam (coming soon)
            </Button>
            <Button variant="outlined" disabled>
              Excel import (later)
            </Button>
          </Stack>
        </ModuleCard>

        <ModuleCard sx={{ maxWidth: 560 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            {found ? `${found.metric.code} · ${found.metric.name}` : 'Metric'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {found?.metric.description}
          </Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {fields.map((field) => (
                <TextField
                  key={field.key}
                  label={field.label}
                  type={field.type === 'number' ? 'number' : 'text'}
                  required
                  value={values[field.key] ?? field.value ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              ))}
              {error ? <Alert severity="error">{error}</Alert> : null}
              {ok ? <Alert severity="success">{ok}</Alert> : null}
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  Validate & save
                </Button>
                {found ? (
                  <Button component={RouterLink} to={`/app/metrics/${found.metric.id}`} variant="outlined">
                    Open metric detail
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Box>
        </ModuleCard>
      </Stack>
    </Box>
  );
}
