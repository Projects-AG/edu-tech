import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import ModuleCard from '../common/ModuleCard';

function StatTile({ icon: Icon, color, label, value, hint }) {
  return (
    <ModuleCard sx={{ flex: '1 1 180px', minWidth: 180 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            bgcolor: `${color}18`,
            color,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.15 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {hint ? (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </ModuleCard>
  );
}

export default function DashboardKpis({ kpis }) {
  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2}>
      <ModuleCard sx={{ flex: '1 1 240px', minWidth: 240 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress variant="determinate" value={100} size={72} thickness={4.5} sx={{ color: 'rgba(37,99,235,0.12)' }} />
            <CircularProgress
              variant="determinate"
              value={kpis.overallProgress.percent}
              size={72}
              thickness={4.5}
              sx={{ color: 'primary.main', position: 'absolute', left: 0, top: 0 }}
            />
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {kpis.overallProgress.percent}%
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Overall Progress
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {kpis.overallProgress.trend}
            </Typography>
          </Box>
        </Stack>
      </ModuleCard>
      <StatTile
        icon={CheckCircleOutlinedIcon}
        color="#16A34A"
        label={kpis.completedMetrics.label}
        value={kpis.completedMetrics.value}
      />
      <StatTile
        icon={FolderOpenOutlinedIcon}
        color="#F59E0B"
        label={kpis.pendingEvidence.label}
        value={kpis.pendingEvidence.value}
      />
      <StatTile
        icon={WarningAmberOutlinedIcon}
        color="#EF4444"
        label={kpis.overdueItems.label}
        value={kpis.overdueItems.value}
      />
      <StatTile
        icon={ScheduleOutlinedIcon}
        color="#3B82F6"
        label={kpis.approvalPending.label}
        value={kpis.approvalPending.value}
      />
    </Stack>
  );
}
