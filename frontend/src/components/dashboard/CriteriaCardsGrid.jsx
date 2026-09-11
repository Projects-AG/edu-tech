import { Box, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ModuleCard from '../common/ModuleCard';

export default function CriteriaCardsGrid({ criteria }) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        NAAC Criteria Overview
      </Typography>
      <Grid container spacing={1.5}>
        {criteria.map((item) => (
          <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <ModuleCard
              component={RouterLink}
              to={`/app/criteria/${item.id}`}
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color 0.15s ease, transform 0.15s ease',
                '&:hover': { borderColor: 'primary.light', transform: 'translateY(-2px)' },
              }}
            >
              <Stack spacing={1}>
                <Typography variant="caption" fontWeight={700} color="primary.main">
                  {item.code}
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ minHeight: 40, lineHeight: 1.3 }}>
                  {item.name}
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {item.percent}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={item.percent}
                  sx={{ height: 7, borderRadius: 999, bgcolor: 'rgba(15,23,42,0.06)' }}
                />
                <Typography variant="caption" color="text.secondary">
                  {item.obtained}/{item.total} Marks
                </Typography>
              </Stack>
            </ModuleCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
