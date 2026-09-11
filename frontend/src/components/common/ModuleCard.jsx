import { Paper } from '@mui/material';

export default function ModuleCard({ children, sx, ...props }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        height: '100%',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04)',
        ...sx,
      }}
      {...props}
    >
      {children}
    </Paper>
  );
}
