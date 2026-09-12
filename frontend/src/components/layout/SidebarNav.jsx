import { NavLink } from 'react-router-dom';
import {
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
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import { COORDINATOR_CYCLE, getNavItems } from '../../config/navigation';
import { ROLES } from '../../utils/roles';

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
  Inbox: InboxOutlinedIcon,
  Person: PersonOutlineOutlinedIcon,
};

function NavBadge({ badge, badgeTone }) {
  if (!badge) return null;
  const success = badgeTone === 'success';
  return (
    <Box
      component="span"
      sx={{
        ml: 'auto',
        px: success ? 1 : 0.9,
        py: 0.2,
        borderRadius: success ? 999 : 1.2,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.4,
        bgcolor: success ? '#166534' : 'rgba(255,255,255,0.12)',
        color: success ? '#BBF7D0' : 'rgba(255,255,255,0.9)',
        minWidth: success ? 'auto' : 22,
        textAlign: 'center',
      }}
    >
      {badge}
    </Box>
  );
}

export default function SidebarNav({ roles = [], activeRole = null, onNavigate }) {
  const items = getNavItems(roles, activeRole);
  const isCoordinator = activeRole === ROLES.IQAC_COORDINATOR;

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'sidebar.bg',
        color: 'sidebar.text',
      }}
    >
      <Box sx={{ px: 2.25, py: 2.25 }}>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            E
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
              {isCoordinator ? 'EDUVERSE NAAC' : 'NAAC Platform'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'sidebar.muted' }}>
              {isCoordinator ? 'Quality Assurance Portal' : 'Accreditation Hub'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {isCoordinator ? (
        <Typography
          variant="caption"
          sx={{
            px: 2.5,
            pt: 2,
            pb: 0.5,
            color: 'sidebar.muted',
            fontWeight: 700,
            letterSpacing: 1.1,
          }}
        >
          NAAC MANAGEMENT
        </Typography>
      ) : null}

      <List sx={{ px: 1.5, py: isCoordinator ? 1 : 2, flex: 1, overflowY: 'auto' }}>
        {items.map((item) => {
          const Icon = ICONS[item.icon] || DashboardOutlinedIcon;
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
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit', position: 'relative' }}>
                <Icon fontSize="small" />
                {item.showDot ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 8,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#EF4444',
                    }}
                  />
                ) : null}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
              />
              <NavBadge badge={item.badge} badgeTone={item.badgeTone} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2 }}>
        {isCoordinator ? (
          <Box
            sx={{
              p: 1.75,
              borderRadius: 2,
              bgcolor: 'rgba(37,99,235,0.18)',
              border: '1px solid rgba(96,165,250,0.35)',
            }}
          >
            <StackRow title={COORDINATOR_CYCLE.title} subtitle={COORDINATOR_CYCLE.year} />
            <Typography variant="caption" sx={{ color: '#93C5FD', fontWeight: 600 }}>
              {COORDINATOR_CYCLE.status}
            </Typography>
          </Box>
        ) : (
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
            <SchoolOutlinedIcon sx={{ color: '#4ADE80', mt: 0.2 }} fontSize="small" />
            <Typography variant="caption" sx={{ color: 'sidebar.muted', lineHeight: 1.4 }}>
              Accreditation Today for a Better Tomorrow.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function StackRow({ title, subtitle }) {
  return (
    <Box sx={{ mb: 0.75 }}>
      <Typography variant="caption" sx={{ color: '#BFDBFE', fontWeight: 800, letterSpacing: 0.8 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>
        {subtitle}
      </Typography>
    </Box>
  );
}
