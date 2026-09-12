import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  LinearProgress,
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
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ModuleCard from '../../components/common/ModuleCard';
import { CRITERIA } from '../../data/mock/criteria';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';
import CoordinatorCriteriaPage from '../coordinator/CoordinatorCriteriaPage';

export default function CriteriaListPage() {
  const { activeRole } = useAuth();
  if (activeRole === ROLES.IQAC_COORDINATOR) return <CoordinatorCriteriaPage />;
  return <DefaultCriteriaList />;
}

function DefaultCriteriaList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    return CRITERIA.filter((c) => {
      const matchQuery =
        !query ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase());
      const matchFilter =
        filter === 'all' ||
        (filter === 'low' && c.percent < 60) ||
        (filter === 'mid' && c.percent >= 60 && c.percent < 80) ||
        (filter === 'high' && c.percent >= 80);
      return matchQuery && matchFilter;
    });
  }, [query, filter]);

  return (
    <Box>
      <PageHeader
        title="NAAC Criteria"
        subtitle="Browse all criteria, progress, and assigned in-charges"
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Criteria' }]}
      />

      <ModuleCard sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="Search criteria..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField select size="small" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="all">All progress</MenuItem>
            <MenuItem value="low">Below 60%</MenuItem>
            <MenuItem value="mid">60% – 79%</MenuItem>
            <MenuItem value="high">80%+</MenuItem>
          </TextField>
        </Stack>
      </ModuleCard>

      <ModuleCard sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Code', 'Criterion', 'Progress', 'Marks', 'In-Charge', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/app/criteria/${row.id}`)}>
                <TableCell>
                  <Typography fontWeight={700} color="primary.main">
                    {row.code}
                  </Typography>
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell sx={{ minWidth: 160 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" fontWeight={700}>
                      {row.percent}%
                    </Typography>
                    <LinearProgress variant="determinate" value={row.percent} sx={{ height: 6, borderRadius: 999 }} />
                  </Stack>
                </TableCell>
                <TableCell>
                  {row.obtained}/{row.total}
                </TableCell>
                <TableCell>{row.inCharge}</TableCell>
                <TableCell align="right">
                  <Button size="small" component={RouterLink} to={`/app/criteria/${row.id}`} onClick={(e) => e.stopPropagation()}>
                    Open
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
