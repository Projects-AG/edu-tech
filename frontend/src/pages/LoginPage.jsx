import { useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';
import { getPrimaryRole, getRolePath, ROLE_META, ROLE_PRIORITY } from '../utils/roles';

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
  return 'Unable to sign in. Check your credentials and try again.';
}

export default function LoginPage() {
  const { login, isAuthenticated, roles, bootstrapping } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!bootstrapping && isAuthenticated) {
    const primary = getPrimaryRole(roles);
    return <Navigate to={getRolePath(primary)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      if (!remember) {
        // Keep tokens in memory-equivalent session via localStorage still required by API client;
        // remember flag is UX-only for prefilled credentials in this phase.
      }
      const primary = getPrimaryRole(data.roles);
      navigate(getRolePath(primary), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { md: 5, lg: 7 },
          color: '#F7FBFA',
          background: `
            linear-gradient(160deg, rgba(6, 56, 67, 0.92) 0%, rgba(11, 79, 92, 0.88) 48%, rgba(196, 131, 42, 0.55) 100%),
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 40%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `,
          backgroundSize: 'cover',
        }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{ letterSpacing: 2, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}
          >
            EduTech · NAAC Foundation
          </Typography>
          <Typography
            variant="h2"
            sx={{
              mt: 2,
              maxWidth: 480,
              fontSize: { md: '2.8rem', lg: '3.4rem' },
              lineHeight: 1.1,
            }}
          >
            NAAC Platform
          </Typography>
          <Typography sx={{ mt: 2, maxWidth: 420, color: 'rgba(255,255,255,0.82)', fontSize: 18 }}>
            One secure sign-in. Your assigned role opens the right accreditation workspace.
          </Typography>
        </Box>

        <Stack spacing={1.5} sx={{ maxWidth: 460 }}>
          {ROLE_PRIORITY.slice(0, 4).map((role) => (
            <Box
              key={role}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1.25,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: ROLE_META[role].accent,
                  flexShrink: 0,
                }}
              />
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#fff' }}>
                  {ROLE_META[role].label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {ROLE_META[role].tagline}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2.5, sm: 4 },
          background: `
            linear-gradient(180deg, #F7FAF9 0%, #EEF3F2 100%),
            radial-gradient(circle at 90% 10%, rgba(196, 131, 42, 0.12), transparent 35%)
          `,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 440,
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 18px 50px rgba(11, 79, 92, 0.08)',
          }}
        >
          <Typography variant="h4" sx={{ fontSize: { xs: '1.7rem', sm: '2rem' } }}>
            Sign in
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Use your institutional email. Access is granted by role assignment.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                inputProps={{ minLength: 8 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    color="primary"
                  />
                }
                label="Keep me signed in on this device"
              />
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            Faculty or department contributor?{' '}
            <Link component={RouterLink} to="/register" fontWeight={600} color="primary">
              Create an account
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
