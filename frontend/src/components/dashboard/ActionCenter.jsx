import { Box, ButtonBase, Grid, Typography } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import HourglassTopOutlinedIcon from '@mui/icons-material/HourglassTopOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import { Link as RouterLink } from 'react-router-dom';
import ModuleCard from '../common/ModuleCard';

const ICONS = {
  CloudUpload: CloudUploadOutlinedIcon,
  EditNote: EditNoteOutlinedIcon,
  HourglassTop: HourglassTopOutlinedIcon,
  RateReview: RateReviewOutlinedIcon,
  Assessment: AssessmentOutlinedIcon,
};

export default function ActionCenter({ actions }) {
  return (
    <ModuleCard>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        My Action Center
      </Typography>
      <Grid container spacing={1.25}>
        {actions.map((action) => {
          const Icon = ICONS[action.icon] || AssessmentOutlinedIcon;
          return (
            <Grid key={action.id} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
              <ButtonBase
                component={RouterLink}
                to={action.path}
                sx={{
                  width: '100%',
                  p: 1.75,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  gap: 1,
                  '&:hover': { bgcolor: 'rgba(37,99,235,0.06)', borderColor: 'primary.light' },
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: 'rgba(37,99,235,0.1)',
                    color: 'primary.main',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Icon fontSize="small" />
                </Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  {action.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {action.description}
                </Typography>
              </ButtonBase>
            </Grid>
          );
        })}
      </Grid>
    </ModuleCard>
  );
}
