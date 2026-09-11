import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ModuleCard from '../../components/common/ModuleCard';
import StatusChip from '../../components/common/StatusChip';
import { EVIDENCE_ITEMS } from '../../data/mock/modules';

export default function EvidenceLibraryPage() {
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return EVIDENCE_ITEMS.filter((item) => {
      const matchStatus = status === 'all' || item.status === status;
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        item.fileName.toLowerCase().includes(q) ||
        item.metricCode.includes(q) ||
        item.department.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [status, query]);

  return (
    <Box>
      <PageHeader
        title="Evidence & Documents"
        subtitle="Library of uploaded evidence linked to metrics"
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Evidence' }]}
        action={
          <Button variant="contained" component={RouterLink} to="/app/evidence/upload">
            Upload evidence
          </Button>
        }
      />

      <ModuleCard sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" placeholder="Search file, metric, department..." value={query} onChange={(e) => setQuery(e.target.value)} sx={{ flex: 1 }} />
          <TextField select size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180 }}>
            {['all', 'Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'].map((s) => (
              <MenuItem key={s} value={s}>
                {s === 'all' ? 'All statuses' : s}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </ModuleCard>

      <ModuleCard sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['File', 'Metric', 'Criterion', 'Department', 'Version', 'Status', 'Uploaded'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {row.fileName}
                  </Typography>
                  {row.rejectionComment ? (
                    <Typography variant="caption" color="error.main">
                      {row.rejectionComment}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>{row.metricCode}</TableCell>
                <TableCell>{row.criterion}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>v{row.version}</TableCell>
                <TableCell>
                  <StatusChip label={row.status} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {row.uploadedBy}
                    <br />
                    {row.uploadedAt}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleCard>
    </Box>
  );
}
