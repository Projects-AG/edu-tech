import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

import { ROLES, normalizeRole } from "../config/roles";
import { ROLE_FALLBACK_PERMISSIONS } from "../config/permissions";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(
    () => localStorage.getItem("accessToken") || null
  );

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");

    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  const [storedRole, setStoredRole] = useState(
    () => localStorage.getItem("selectedRole") || null
  );

  const [devRole, setDevRoleState] = useState(null);

  const [backendPermissions, setBackendPermissions] = useState(null);

  // ---------------------------------------
  // Sync authentication from localStorage
  // ---------------------------------------
  const syncAuthFromStorage = () => {
    const t = localStorage.getItem("accessToken");
    const u = localStorage.getItem("user");
    const r = localStorage.getItem("selectedRole");

    setToken(t);
    setStoredRole(r);

    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  // ---------------------------------------
  // Fetch authenticated user
  // ---------------------------------------
  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        console.log("AUTH ME RESPONSE:", res.data);

        const authenticatedRole = res.data?.role?.name;

        if (authenticatedRole) {
          const authenticatedUser = {
            ...res.data.user,
            role: authenticatedRole,
          };

          localStorage.setItem(
            "user",
            JSON.stringify(authenticatedUser)
          );

          localStorage.setItem(
            "selectedRole",
            authenticatedRole
          );

          setUser(authenticatedUser);
          setStoredRole(authenticatedRole);
        }

        // ---------------------------------------
        // Backend permissions
        // ---------------------------------------
        if (res.data?.permissions) {
          const perms = [];

          res.data.permissions.forEach((mod) => {
            if (Array.isArray(mod.permissions)) {
              mod.permissions.forEach((permission) => {
                perms.push(permission);

                if (mod.module_code) {
                  perms.push(
                    `${mod.module_code}:${permission}`
                  );

                  perms.push(
                    `${mod.module_code.toLowerCase()}.${permission.toLowerCase()}`
                  );
                }
              });
            }
          });

          setBackendPermissions(perms);
        }
      })
      .catch((err) => {
        console.error("AUTH ME FAILED:", err);

        if (
          err.response?.status === 401 ||
          err.response?.status === 403
        ) {
          console.warn("Token is invalid. Clearing session.");

          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          localStorage.removeItem("selectedRole");

          setToken(null);
          setUser(null);
          setStoredRole(null);
          setBackendPermissions(null);
        } else {
          console.warn(
            "Could not fetch /auth/me. Using fallback permissions."
          );
        }
      });
  }, [token]);

  // ---------------------------------------
  // Active role
  // ---------------------------------------
  const activeRole = useMemo(() => {
    if (import.meta.env.DEV && devRole) {
      return normalizeRole(devRole);
    }

    const roleCandidate =
      user?.role ||
      storedRole ||
      ROLES.COORDINATOR;

    return normalizeRole(roleCandidate);
  }, [user, storedRole, devRole]);

  // ---------------------------------------
  // Effective permissions
  // ---------------------------------------
  const effectivePermissions = useMemo(() => {
    if (
      backendPermissions &&
      backendPermissions.length > 0 &&
      (!import.meta.env.DEV || !devRole)
    ) {
      return backendPermissions;
    }

    return ROLE_FALLBACK_PERMISSIONS[activeRole] || [];
  }, [
    backendPermissions,
    activeRole,
    devRole,
  ]);

  // ---------------------------------------
  // Permission check
  // ---------------------------------------
  const hasPermission = (permKey) => {
    if (activeRole === ROLES.ADMIN) {
      return true;
    }

    return effectivePermissions.includes(permKey);
  };

  // ---------------------------------------
  // DEV role switcher
  // ---------------------------------------
  const setDevRole = (role) => {
    if (import.meta.env.DEV) {
      setDevRoleState(role);
    }
  };

  // ---------------------------------------
  // Logout
  // ---------------------------------------
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedRole");

    setToken(null);
    setUser(null);
    setStoredRole(null);
    setDevRoleState(null);
    setBackendPermissions(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        activeRole,
        storedRole,
        devRole,

        setDevRole,

        permissions: effectivePermissions,

        hasPermission,

        syncAuthFromStorage,

        logout,

        isAuthenticated: !!token,

        isDev: import.meta.env.DEV,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};

export default AuthContext;