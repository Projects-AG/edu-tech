import { NavLink } from 'react-router-dom';
import {
  Badge,
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ParkOutlinedIcon from '@mui/icons-material/ParkOutlined';
import { getNavForRoles } from '../../config/navigation';
import { NOTIFICATIONS } from '../../data/mock/modules';

const ICONS = {
  Dashboard: DashboardOutlinedIcon,
  FactCheck: FactCheckOutlinedIcon,
  FolderOpen: FolderOpenOutlinedIcon,
  EditNote: EditNoteOutlinedIcon,
  TaskAlt: TaskAltOutlinedIcon,
  RateReview: RateReviewOutlinedIcon,
  Assessment: AssessmentOutlinedIcon,
  Notifications: NotificationsOutlinedIcon,
  Apartment: ApartmentOutlinedIcon,
  ManageAccounts: ManageAccountsOutlinedIcon,
  History: HistoryOutlinedIcon,
  Settings: SettingsOutlinedIcon,
};

export default function SidebarNav({ roles = [], onNavigate }) {
  const items = getNavForRoles(roles);
  const unread = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'sidebar.bg', color: 'sidebar.text' }}>
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Typography variant="overline" sx={{ letterSpacing: 1.4, color: 'sidebar.muted', fontWeight: 700 }}>
          NAAC Platform
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.5, color: '#fff', lineHeight: 1.25 }}>
          Accreditation Hub
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      <List sx={{ px: 1.5, py: 2, flex: 1, overflowY: 'auto' }}>
        {items.map((item) => {
          const Icon = ICONS[item.icon] || DashboardOutlinedIcon;
          const badge = item.badgeKey === 'notifications' ? unread : 0;
          return (
            <ListItemButton
              key={item.id}
              component={NavLink}
              to={item.path}
              end={item.path === '/app/dashboard'}
              onClick={() => onNavigate?.(item)}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                color: 'sidebar.text',
                '&.active': {
                  bgcolor: 'sidebar.active',
                  color: '#fff',
                },
                '&:hover': { bgcolor: 'sidebar.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                {badge ? (
                  <Badge badgeContent={badge} color="error">
                    <Icon fontSize="small" />
                  </Badge>
                ) : (
                  <Icon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            p: 1.75,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: 1.25,
            alignItems: 'flex-start',
          }}
        >
          <ParkOutlinedIcon sx={{ color: '#4ADE80', mt: 0.2 }} fontSize="small" />
          <Typography variant="caption" sx={{ color: 'sidebar.muted', lineHeight: 1.4 }}>
            Accreditation Today for a Better Tomorrow.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
