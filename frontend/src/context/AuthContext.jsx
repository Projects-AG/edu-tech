import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { getPrimaryRole, normalizeRoles } from '../utils/roles';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStoredRoles() {
  try {
    const raw = localStorage.getItem('auth_roles');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [roles, setRoles] = useState(readStoredRoles);
  const [activeRole, setActiveRole] = useState(() => getPrimaryRole(readStoredRoles()));
  const [bootstrapping, setBootstrapping] = useState(Boolean(localStorage.getItem('access_token')));

  const persistSession = useCallback((nextUser, nextRoles, tokens) => {
    const normalized = normalizeRoles(nextRoles);
    setUser(nextUser);
    setRoles(normalized);
    setActiveRole(getPrimaryRole(normalized));
    localStorage.setItem('auth_user', JSON.stringify(nextUser));
    localStorage.setItem('auth_roles', JSON.stringify(normalized));
    if (tokens?.access_token) localStorage.setItem('access_token', tokens.access_token);
    if (tokens?.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setRoles([]);
    setActiveRole(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_roles');
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.fetchMe();
        if (cancelled) return;
        const nextRoles = normalizeRoles(me.roles);
        persistSession(
          {
            id: me.id,
            name: me.name,
            email: me.email,
            institution_id: me.institution_id,
            department_id: me.department_id,
            is_active: me.is_active,
          },
          nextRoles,
        );
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession, persistSession]);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login(email, password);
      persistSession(data.user, data.roles, {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      return data;
    },
    [persistSession],
  );

  const register = useCallback(async (payload) => {
    return authApi.register(payload);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (localStorage.getItem('access_token')) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Always clear local session even if API logout fails.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const switchRole = useCallback(
    (role) => {
      if (roles.includes(role)) setActiveRole(role);
    },
    [roles],
  );

  const value = useMemo(
    () => ({
      user,
      roles,
      activeRole,
      isAuthenticated: Boolean(user && localStorage.getItem('access_token')),
      bootstrapping,
      login,
      register,
      logout,
      switchRole,
    }),
    [user, roles, activeRole, bootstrapping, login, register, logout, switchRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
