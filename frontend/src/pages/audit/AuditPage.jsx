import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
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
import { listAuditLogs } from '../../api/platform';
import { useAuth } from '../../context/AuthContext';

export default function AuditPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [action, setAction] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.institution_id) return;
      try {
        const data = await listAuditLogs(user.institution_id);
        if (!cancelled) {
          setRows(data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || 'Could not load audit logs.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.institution_id]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchAction = action === 'all' || row.action === action;
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        row.action?.toLowerCase().includes(q) ||
        row.entity_type?.toLowerCase().includes(q) ||
        row.actor_id?.toLowerCase().includes(q);
      return matchAction && matchQuery;
    });
  }, [rows, action, query]);

  const actions = useMemo(() => ['all', ...new Set(rows.map((r) => r.action).filter(Boolean))], [rows]);

  return (
    <Box>
      <PageHeader
        title="Audit Log"
        subtitle="Compliance activity across modules"
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Audit' }]}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <ModuleCard sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" placeholder="Search actor, action, entity..." value={query} onChange={(e) => setQuery(e.target.value)} sx={{ flex: 1 }} />
          <TextField select size="small" value={action} onChange={(e) => setAction(e.target.value)} sx={{ minWidth: 180 }}>
            {actions.map((a) => (
              <MenuItem key={a} value={a}>
                {a === 'all' ? 'All actions' : a}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </ModuleCard>

      <ModuleCard sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['When', 'Action', 'Entity', 'Actor', 'Entity ID'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">No audit events yet.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.entity_type}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {row.actor_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {row.entity_id || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ModuleCard>
    </Box>
  );
}
