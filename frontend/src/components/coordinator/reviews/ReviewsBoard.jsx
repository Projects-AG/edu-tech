import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ModuleCard from '../../common/ModuleCard';
import StatusChip from '../../common/StatusChip';

function InspectionPanel({ item, onClose }) {
  if (!item) {
    return (
      <ModuleCard>
        <Typography color="text.secondary">Select a queue item to open inspection.</Typography>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard sx={{ p: 0, overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'primary.main', color: '#fff', px: 2, py: 1.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700 }}>
              ACTIVE INSPECTION
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {item.ref}
            </Typography>
          </Box>
          <Button size="small" onClick={onClose} sx={{ color: '#fff' }}>
            Close
          </Button>
        </Stack>
      </Box>

      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {item.criterion}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.description}
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
              ['Current Status', null],
              ['Submission Date', item.submittedAt],
              ['Last Updated', item.updatedAt],
            ].map(([label, value]) => (
              <Box key={label}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                {label === 'Current Status' ? (
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
            <Stack spacing={1.1}>
              {(item.workflow || []).map((step, idx) => {
                const done = step.state === 'done';
                const current = step.state === 'current';
                return (
                  <Stack key={step.step} direction="row" spacing={1.25} alignItems="flex-start">
                    {done ? (
                      <CheckCircleOutlinedIcon fontSize="small" color="success" />
                    ) : (
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: current ? 'warning.main' : 'divider',
                          color: current ? 'warning.main' : 'text.secondary',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {current ? idx + 1 : <RadioButtonUncheckedIcon sx={{ fontSize: 14 }} />}
                      </Box>
                    )}
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        {step.step}
                        {current ? (
                          <Chip
                            size="small"
                            label="Flagged"
                            sx={{ ml: 1, height: 20, fontSize: 10, fontWeight: 700 }}
                          />
                        ) : null}
                      </Typography>
                      {step.note ? (
                        <Typography variant="caption" color="text.secondary">
                          {step.note}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          {item.alert ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#FFF7ED',
                border: '1px solid #FED7AA',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} color="#C2410C">
                {item.alert}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.alertAt}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Box>
    </ModuleCard>
  );
}

export default function ReviewsBoard({ queue = [] }) {
  const [selectedId, setSelectedId] = useState(
    queue.find((q) => q.status === 'Needs Correction')?.id || queue[0]?.id || null,
  );
  const selected = useMemo(() => queue.find((q) => q.id === selectedId) || null, [queue, selectedId]);

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
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Review & Approval Queue
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing 1 to {queue.length} of {queue.length + 31}
            </Typography>
          </Box>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              {['Submission / Metric', 'Dept', 'Current Stage', 'Assigned To', 'Status'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {queue.map((row) => {
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
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={active} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {row.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.metric}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.department}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.stage} sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.assignedTo}</Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip label={row.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ModuleCard>

      <InspectionPanel item={selected} onClose={() => setSelectedId(null)} />
    </Box>
  );
}
