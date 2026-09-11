import {
  AppBar,
  Avatar,
  Badge,
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { NOTIFICATIONS } from '../../data/mock/modules';

export default function TopHeader({
  drawerWidth,
  isMobile,
  onMenuClick,
  user,
  activeRoleLabel,
  onAvatarClick,
}) {
  const unread = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        bgcolor: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(10px)',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 64, md: 72 }, py: 1 }}>
        {isMobile && (
          <IconButton edge="start" onClick={onMenuClick} aria-label="Open navigation">
            <MenuIcon />
          </IconButton>
        )}

        <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: 'none', lg: 'flex' }, maxWidth: 240, minWidth: 0 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: 'rgba(37,99,235,0.1)',
              color: 'primary.main',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <AccountBalanceOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              ABC Institute of Technology
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Quality Education for a Better Tomorrow
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'left', md: 'center' } }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ fontSize: { xs: '0.92rem', md: '1.05rem' } }}>
            NAAC Accreditation Management System
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Web Portal
          </Typography>
        </Box>

        <TextField
          size="small"
          placeholder="Search anything..."
          sx={{
            display: { xs: 'none', md: 'block' },
            width: { md: 200, lg: 260 },
            '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: '#F8FAFC' },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <IconButton component={RouterLink} to="/app/notifications" aria-label="Notifications">
          <Badge badgeContent={unread} color="error">
            <NotificationsNoneOutlinedIcon />
          </Badge>
        </IconButton>

        <Stack direction="row" spacing={1} alignItems="center" onClick={onAvatarClick} sx={{ cursor: 'pointer', minWidth: 0 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {user?.name || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {activeRoleLabel}
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
