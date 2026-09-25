import React from "react";
import { useAuth } from "../../context/AuthContext";

export const PermissionGuard = ({ permission, children, fallback = null }) => {
  const { hasPermission } = useAuth();

  if (!permission || hasPermission(permission)) {
    return <>{children}</>;
  }

  return fallback;
};

export default PermissionGuard;
