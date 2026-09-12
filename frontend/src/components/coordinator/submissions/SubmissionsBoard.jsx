import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ModuleCard from '../../common/ModuleCard';
import StatusChip from '../../common/StatusChip';

const WORKFLOW = ['Draft', 'Submitted', 'Correction', 'Approved'];

function stageIndex(status) {
  if (status === 'Approved') return 3;
  if (status === 'Needs Correction') return 2;
  if (status === 'Under Review' || status === 'Submitted') return 1;
  return 0;
}

function DetailPanel({ item, onClose }) {
  if (!item) {
    return (
      <ModuleCard>
        <Typography color="text.secondary">Select a submission to inspect details.</Typography>
      </ModuleCard>
    );
  }

  const active = stageIndex(item.status);

  return (
    <ModuleCard>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Chip
            size="small"
            label="SELECTED SUBMISSION"
            sx={{ fontWeight: 700, bgcolor: '#FFEDD5', color: '#C2410C' }}
          />
          <Button size="small" onClick={onClose}>
            Close
          </Button>
        </Stack>

        <Box>
          <Typography variant="caption" color="text.secondary">
            {item.id.toUpperCase()}
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {item.title}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.25,
          }}
        >
          {[
            ['Criterion', item.criterion],
            ['Department', item.department],
            ['Submitted By', item.submittedBy],
            ['Status', null],
            ['Submission Date', item.submittedAt],
            ['Last Updated', item.updatedAt],
          ].map(([label, value]) => (
            <Box key={label}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              {label === 'Status' ? (
                <Box sx={{ mt: 0.35 }}>
                  <StatusChip label={item.status} />
                </Box>
              ) : (
                <Typography variant="body2" fontWeight={600}>
                  {value}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Workflow Progression
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {WORKFLOW.map((step, idx) => {
              const done = idx < active;
              const current = idx === active;
              return (
                <Chip
                  key={step}
                  size="small"
                  label={step}
                  sx={{
                    fontWeight: 700,
                    bgcolor: current ? '#DBEAFE' : done ? '#DCFCE7' : '#F1F5F9',
                    color: current ? '#1D4ED8' : done ? '#15803D' : '#64748B',
                  }}
                />
              );
            })}
          </Stack>
        </Box>

        {item.correctionNote ? (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: '#FFF7ED',
              border: '1px solid #FED7AA',
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="#C2410C">
              Correction Reason
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {item.correctionNote}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
              {item.correctionBy} · {item.correctionAt}
            </Typography>
          </Box>
        ) : null}

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            Attached Evidence
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item.files} files · {item.size}
          </Typography>
        </Box>
      </Stack>
    </ModuleCard>
  );
}

export default function SubmissionsBoard({ submissions = [] }) {
  const [selectedId, setSelectedId] = useState(
    submissions.find((s) => s.status === 'Needs Correction')?.id || submissions[0]?.id || null,
  );
  const selected = useMemo(
    () => submissions.find((s) => s.id === selectedId) || null,
    [submissions, selectedId],
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', lg: '1.45fr 1fr' },
        alignItems: 'start',
      }}
    >
      <ModuleCard sx={{ overflowX: 'auto' }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
          All Submissions Registry
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Showing active submissions across Criteria 1 through 7
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              {['Submission', 'Criterion', 'Department', 'Submitted By', 'Date', 'Status', ''].map((h) => (
                <TableCell key={h || 'x'} sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((row) => {
              const active = row.id === selectedId;
              return (
                <TableRow
                  key={row.id}
                  hover
                  selected={active}
                  onClick={() => setSelectedId(row.id)}
                  sx={{
                    cursor: 'pointer',
                    ...(active ? { borderLeft: '3px solid', borderLeftColor: 'primary.main' } : {}),
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {row.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.criterion} sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.department}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.submittedBy}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.submittedAt}</Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip label={row.status} />
                  </TableCell>
                  <TableCell>
                    <Button size="small" sx={{ fontWeight: 700 }}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ModuleCard>

      <DetailPanel item={selected} onClose={() => setSelectedId(null)} />
    </Box>
  );
}
