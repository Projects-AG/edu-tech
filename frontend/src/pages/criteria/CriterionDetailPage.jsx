import { Alert, Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ModuleCard from '../../components/common/ModuleCard';
import StatusChip from '../../components/common/StatusChip';
import { getCriterion } from '../../data/mock/criteria';

export default function CriterionDetailPage() {
  const { criterionId } = useParams();
  const criterion = getCriterion(criterionId);

  if (!criterion) {
    return <Alert severity="warning">Criterion not found.</Alert>;
  }

  return (
    <Box>
      <PageHeader
        title={`${criterion.code} · ${criterion.name}`}
        subtitle={`In-Charge: ${criterion.inCharge} · ${criterion.obtained}/${criterion.total} marks (${criterion.percent}%)`}
        crumbs={[
          { label: 'Dashboard', to: '/app/dashboard' },
          { label: 'Criteria', to: '/app/criteria' },
          { label: criterion.code },
        ]}
        action={
          <Button variant="outlined" component={RouterLink} to="/app/tasks">
            Assign tasks
          </Button>
        }
      />

      <ModuleCard sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Score / Progress
            </Typography>
            <Typography variant="h4" fontWeight={800}>
              {criterion.percent}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Obtained {criterion.obtained} of {criterion.total} marks
            </Typography>
          </Box>
          <Chip label={`Owner: ${criterion.inCharge}`} />
        </Stack>
      </ModuleCard>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Key Indicators → Metrics
      </Typography>

      {(criterion.indicators || []).length === 0 ? (
        <ModuleCard>
          <Typography color="text.secondary">
            Indicator tree will appear here once criteria metrics are configured for this pillar.
          </Typography>
        </ModuleCard>
      ) : (
        <Stack spacing={2}>
          {criterion.indicators.map((ki) => (
            <ModuleCard key={ki.id}>
              <Typography variant="subtitle1" fontWeight={700}>
                {ki.code} · {ki.name}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1.25}>
                {(ki.metrics || []).map((metric) => (
                  <Stack
                    key={metric.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#F8FAFC',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        {metric.code} · {metric.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Weightage: {metric.weightage}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <StatusChip label={metric.status} />
                      <Button size="small" component={RouterLink} to={`/app/metrics/${metric.id}`}>
                        Open metric
                      </Button>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </ModuleCard>
          ))}
        </Stack>
      )}
    </Box>
  );
}
