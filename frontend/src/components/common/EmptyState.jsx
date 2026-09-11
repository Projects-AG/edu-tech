import { Box, Typography } from '@mui/material';

export default function EmptyState({ title, description }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
      <Typography variant="subtitle1" fontWeight={700} color="text.primary">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          {description}
        </Typography>
      ) : null}
    </Box>
  );
}
