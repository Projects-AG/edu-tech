import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { REVIEW_QUEUE } from '../../data/mock/modules';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';

export default function ReviewsPage() {
  const { roles, activeRole } = useAuth();
  const isFinal = roles.includes(ROLES.FINAL_APPROVER) || activeRole === ROLES.FINAL_APPROVER;
  const [queue, setQueue] = useState(REVIEW_QUEUE);
  const [active, setActive] = useState(null);
  const [comment, setComment] = useState('');

  const rows = useMemo(() => {
    if (isFinal && !roles.includes(ROLES.REVIEWER) && !roles.includes(ROLES.IQAC_COORDINATOR)) {
      return queue.filter((r) => r.type === 'Final Sign-off' || r.status === 'Awaiting Final Approval');
    }
    return queue;
  }, [queue, isFinal, roles]);

  const decide = (decision) => {
    if (!active) return;
    setQueue((prev) =>
      prev.map((item) =>
        item.id === active.id
          ? {
              ...item,
              status: decision === 'approve' ? 'Approved' : 'Rejected',
              decisionComment: comment,
            }
          : item,
      ),
    );
    setActive(null);
    setComment('');
  };

  return (
    <Box>
      <PageHeader
        title="Review & Approvals"
        subtitle={isFinal ? 'Final sign-off queue for criterion / SSR packs' : 'Review evidence, compare versions, approve or reject'}
        crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Reviews' }]}
      />

      <ModuleCard sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Item', 'Type', 'Submitted by', 'Version', 'Submitted', 'Status', ''].map((h) => (
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
                    {row.title}
                  </Typography>
                  {row.decisionComment ? (
                    <Typography variant="caption" color="text.secondary">
                      Note: {row.decisionComment}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.submittedBy}</TableCell>
                <TableCell>v{row.version}</TableCell>
                <TableCell>{row.submittedAt}</TableCell>
                <TableCell>
                  <StatusChip label={row.status} />
                </TableCell>
                <TableCell align="right">
                  {(row.status === 'Pending Review' || row.status === 'Awaiting Final Approval') && (
                    <Button size="small" onClick={() => setActive(row)}>
                      Review
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ModuleCard>

      <Dialog open={Boolean(active)} onClose={() => setActive(null)} fullWidth maxWidth="sm">
        <DialogTitle>Review item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography fontWeight={700}>{active?.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              Compare versions: current v{active?.version} (UI placeholder for side-by-side diff).
            </Typography>
            <TextField
              label="Comment"
              multiline
              minRows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={() => decide('reject')}>
            Reject
          </Button>
          <Button variant="contained" color="success" onClick={() => decide('approve')}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
