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
import PageHeader from '../../components/common/PageHeader';
import ModuleCard from '../../components/common/ModuleCard';
import StatusChip from '../../components/common/StatusChip';
import { REPORTS } from '../../data/mock/modules';

export default function ReportsPage() {
  const [type, setType] = useState('all');
  const [cycle, setCycle] = useState('2024-25');
  const [rows, setRows] = useState(REPORTS);

  const filtered = useMemo(
    () => rows.filter((r) => (type === 'all' || r.type === type) && r.cycle === cycle),
    [rows, type, cycle],
  );

  const generate = () => {
    setRows((prev) => [
      {
        id: `custom-${Date.now()}`,
        name: 'Custom Progress Report',
        type: 'Custom',
        status: 'Ready',
        cycle,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
  };

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="SSR, AQAR, DVV and criterion-wise downloads"
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Reports' }]}
        action={
          <Button variant="contained" onClick={generate}>
            Generate report
          </Button>
        }
      />

      <ModuleCard sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField select size="small" label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 160 }}>
            {['all', 'SSR', 'AQAR', 'DVV', 'Criterion', 'Custom'].map((t) => (
              <MenuItem key={t} value={t}>
                {t === 'all' ? 'All types' : t}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Cycle / Year" value={cycle} onChange={(e) => setCycle(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="2024-25">2024-25</MenuItem>
            <MenuItem value="2023-24">2023-24</MenuItem>
          </TextField>
        </Stack>
      </ModuleCard>

      <ModuleCard sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Report', 'Type', 'Cycle', 'Status', 'Updated', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {row.name}
                  </Typography>
                </TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.cycle}</TableCell>
                <TableCell>
                  <StatusChip label={row.status} />
                </TableCell>
                <TableCell>{row.updatedAt}</TableCell>
                <TableCell align="right">
                  <Button size="small" disabled={row.status === 'Draft' || row.status === 'In Progress'}>
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleCard>
    </Box>
  );
}
