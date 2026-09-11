import { Box, Breadcrumbs, Link as MuiLink, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function PageHeader({ title, subtitle, crumbs = [], action }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      spacing={1.5}
      sx={{ mb: 2.5 }}
    >
      <Box>
        {crumbs.length > 0 && (
          <Breadcrumbs sx={{ mb: 0.75 }}>
            {crumbs.map((c) =>
              c.to ? (
                <MuiLink key={c.label} component={RouterLink} to={c.to} underline="hover" color="inherit" variant="body2">
                  {c.label}
                </MuiLink>
              ) : (
                <Typography key={c.label} variant="body2" color="text.secondary">
                  {c.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.35rem', md: '1.6rem' } }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
  );
}
