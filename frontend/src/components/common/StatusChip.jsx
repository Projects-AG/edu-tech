import { Chip } from '@mui/material';

const TONES = {
  Approved: { bg: '#DCFCE7', color: '#15803D' },
  Ready: { bg: '#DCFCE7', color: '#15803D' },
  Completed: { bg: '#DCFCE7', color: '#15803D' },
  Verified: { bg: '#DCFCE7', color: '#15803D' },
  'On Track': { bg: '#DCFCE7', color: '#15803D' },
  Flagged: { bg: '#FEE2E2', color: '#B91C1C' },
  Rejected: { bg: '#FEE2E2', color: '#B91C1C' },
  Pending: { bg: '#FEF3C7', color: '#B45309' },
  'Pending Review': { bg: '#FEF3C7', color: '#B45309' },
  'Needs Attention': { bg: '#FEF3C7', color: '#B45309' },
  'Needs Correction': { bg: '#FEE2E2', color: '#B91C1C' },
  Critical: { bg: '#FEE2E2', color: '#B91C1C' },
  'Under Review': { bg: '#EDE9FE', color: '#6D28D9' },
  Submitted: { bg: '#DBEAFE', color: '#1D4ED8' },
  Draft: { bg: '#F1F5F9', color: '#475569' },
  Overdue: { bg: '#FEE2E2', color: '#B91C1C' },
  'Due Today': { bg: '#FFEDD5', color: '#C2410C' },
  Open: { bg: '#DBEAFE', color: '#1D4ED8' },
  'In Progress': { bg: '#E0F2FE', color: '#0369A1' },
  'Awaiting Final Approval': { bg: '#FFE4E6', color: '#BE123C' },
  High: { bg: '#FEE2E2', color: '#B91C1C' },
  Medium: { bg: '#FEF3C7', color: '#B45309' },
  Low: { bg: '#DCFCE7', color: '#15803D' },
};

export default function StatusChip({ label, size = 'small' }) {
  const tone = TONES[label] || { bg: '#F1F5F9', color: '#475569' };
  return (
    <Chip
      size={size}
      label={label}
      sx={{
        fontWeight: 600,
        fontSize: 11,
        height: 24,
        bgcolor: tone.bg,
        color: tone.color,
        borderRadius: 999,
      }}
    />
  );
}
