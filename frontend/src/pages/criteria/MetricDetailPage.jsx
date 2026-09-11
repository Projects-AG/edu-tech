import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ModuleCard from '../../components/common/ModuleCard';
import StatusChip from '../../components/common/StatusChip';
import { getMetric } from '../../data/mock/criteria';
import { EVIDENCE_ITEMS } from '../../data/mock/modules';

export default function MetricDetailPage() {
  const { metricId } = useParams();
  const found = getMetric(metricId);

  const linkedEvidence = useMemo(() => {
    if (!found) return [];
    return EVIDENCE_ITEMS.filter((e) => e.metricCode === found.metric.code);
  }, [found]);

  const [fields, setFields] = useState(() =>
    Object.fromEntries((found?.metric.fields || []).map((f) => [f.key, f.value])),
  );
  const [saved, setSaved] = useState(false);

  if (!found) {
    return <Alert severity="warning">Metric not found.</Alert>;
  }

  const { criterion, indicator, metric } = found;

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <Box>
      <PageHeader
        title={`${metric.code} · ${metric.name}`}
        subtitle={metric.description}
        crumbs={[
          { label: 'Criteria', to: '/app/criteria' },
          { label: criterion.code, to: `/app/criteria/${criterion.id}` },
          { label: metric.code },
        ]}
        action={
          <Button variant="contained" component={RouterLink} to="/app/evidence/upload">
            Upload evidence
          </Button>
        }
      />

      <Stack spacing={2}>
        <ModuleCard>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="body2" color="text.secondary">
                Indicator
              </Typography>
              <Typography fontWeight={700}>
                {indicator.code} · {indicator.name}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">Weightage: {metric.weightage}</Typography>
              <StatusChip label={metric.status} />
            </Stack>
          </Stack>
        </ModuleCard>

        <ModuleCard>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            Quantitative data
          </Typography>
          <Stack spacing={1.5} sx={{ maxWidth: 480 }}>
            {(metric.fields || []).map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                type={field.type === 'number' ? 'number' : 'text'}
                value={fields[field.key] ?? ''}
                onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            ))}
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={handleSave}>
                Save draft
              </Button>
              <Button variant="outlined" component={RouterLink} to="/app/data-entry">
                Open data entry
              </Button>
            </Stack>
            {saved ? <Alert severity="success">Draft saved locally (API wiring next).</Alert> : null}
          </Stack>
        </ModuleCard>

        <ModuleCard>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Linked evidence
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          {linkedEvidence.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              No evidence linked yet.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {linkedEvidence.map((item) => (
                <Stack
                  key={item.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ p: 1.25, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid', borderColor: 'divider' }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      {item.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      v{item.version} · {item.uploadedBy} · {item.uploadedAt}
                    </Typography>
                  </Box>
                  <StatusChip label={item.status} />
                </Stack>
              ))}
            </Stack>
          )}
        </ModuleCard>
      </Stack>
    </Box>
  );
}
