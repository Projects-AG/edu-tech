import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { fetchDepartmentCriteriaBreakdown } from '../../../api/coordinator';
import ModuleCard from '../../common/ModuleCard';
import StatusChip from '../../common/StatusChip';

function DetailPanel({ dept, breakdown, breakdownLoading, onClose }) {
  if (!dept) {
    return (
      <ModuleCard sx={{ height: '100%' }}>
        <Typography color="text.secondary">Select a department to inspect progress.</Typography>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {dept.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              HoD / Coordinator: {dept.coordinator}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip label={dept.status} />
            <Button size="small" onClick={onClose}>
              Close
            </Button>
          </Stack>
        </Stack>

        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" fontWeight={700}>
              Department Progress
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {dept.progress}% Overall
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={dept.progress}
            sx={{ height: 10, borderRadius: 999, bgcolor: 'rgba(15,23,42,0.06)' }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.25,
          }}
        >
          {[
            ['Criteria Completed', `${dept.criteriaDone} of ${dept.criteriaTotal}`],
            ['Evidence Uploaded', `${dept.evidenceUploaded}/${dept.evidenceTotal}`],
            ['Submissions Done', `${dept.submissionsDone}/${dept.submissionsTotal} Signed`],
            ['Pending Tasks', `${dept.pendingTasks} Pending`],
          ].map(([label, value]) => (
            <Box
              key={label}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'rgba(248,250,252,0.9)',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            NAAC Criteria Breakdown
          </Typography>
          {breakdownLoading ? (
            <Stack alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            <Stack spacing={1.25}>
              {breakdown.map((row) => (
                <Box key={row.code}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {row.code}: {row.name}
                    </Typography>
                    <StatusChip label={row.status} />
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LinearProgress
                      variant="determinate"
                      value={row.percent}
                      sx={{ flex: 1, height: 6, borderRadius: 999 }}
                    />
                    <Typography variant="caption" fontWeight={700} sx={{ minWidth: 36 }}>
                      {row.percent}%
                    </Typography>
                  </Stack>
                </Box>
              ))}
              {!breakdown.length ? (
                <Typography variant="body2" color="text.secondary">
                  No criteria breakdown available.
                </Typography>
              ) : null}
            </Stack>
          )}
        </Box>
      </Stack>
    </ModuleCard>
  );
}

export default function DepartmentsBoard({ departments = [], cycleId = null }) {
  const [selectedId, setSelectedId] = useState(departments[0]?.id || null);
  const [breakdown, setBreakdown] = useState([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const selected = useMemo(
    () => departments.find((d) => d.id === selectedId) || null,
    [departments, selectedId],
  );

  useEffect(() => {
    if (departments.length && !departments.some((d) => d.id === selectedId)) {
      setSelectedId(departments[0]?.id || null);
    }
  }, [departments, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setBreakdown([]);
      return;
    }

    let cancelled = false;
    setBreakdownLoading(true);
    fetchDepartmentCriteriaBreakdown(selectedId, cycleId)
      .then((rows) => {
        if (!cancelled) setBreakdown(rows);
      })
      .catch(() => {
        if (!cancelled) setBreakdown([]);
      })
      .finally(() => {
        if (!cancelled) setBreakdownLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, cycleId]);

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' },
        alignItems: 'start',
      }}
    >
      <ModuleCard sx={{ overflowX: 'auto' }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
          Department Progress Registry
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Department', 'Coordinator', 'Criteria Progress', 'Evidence', ''].map((h) => (
                <TableCell key={h || 'a'} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {departments.map((dept) => {
              const active = dept.id === selectedId;
              const gap = dept.progress - dept.target;
              const evidencePct =
                dept.evidenceTotal > 0
                  ? Math.round((dept.evidenceUploaded / dept.evidenceTotal) * 1000) / 10
                  : 0;
              return (
                <TableRow
                  key={dept.id}
                  hover
                  selected={active}
                  onClick={() => setSelectedId(dept.id)}
                  sx={{
                    cursor: 'pointer',
                    ...(active
                      ? { borderLeft: '3px solid', borderLeftColor: 'primary.main' }
                      : {}),
                  }}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 12 }}>
                        {dept.code}
                      </Avatar>
                      <Typography variant="body2" fontWeight={700}>
                        {dept.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {dept.coordinator}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dept.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {dept.progress}%{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        Target: {dept.target}%
                      </Typography>
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={dept.progress}
                      sx={{ mt: 0.5, height: 6, borderRadius: 999 }}
                    />
                    <Typography
                      variant="caption"
                      color={gap >= 0 ? 'success.main' : 'warning.main'}
                      fontWeight={700}
                    >
                      {gap >= 0 ? 'On target' : `Gap: ${gap}%`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {dept.evidenceUploaded}/{dept.evidenceTotal}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {evidencePct}% uploaded
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip label={dept.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ModuleCard>

      <DetailPanel
        dept={selected}
        breakdown={breakdown}
        breakdownLoading={breakdownLoading}
        onClose={() => setSelectedId(null)}
      />
    </Box>
  );
}
