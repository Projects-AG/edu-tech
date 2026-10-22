
import React from "react";
import { useLocation } from "react-router-dom";
import {
  ChevronRight,
  Search,
  Bell,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const Header = () => {
  const location = useLocation();
  const { user, activeRole } = useAuth();

  // Simple breadcrumb title calculation
  const getPageTitle = (path) => {
    if (path.includes("admin-dashboard")) return "Admin Overview";
    if (path.includes("institutions")) return "Institution Management";
    if (path.includes("users")) return "User Management";
    if (path.includes("roles")) return "Role & Permissions";
    if (path.includes("settings")) return "System Settings";
    if (path.includes("departments")) return "Departments";
    if (path.includes("criteria")) return "NAAC Criteria";
    if (path.includes("documents")) return "Documents & Evidence";
    if (path.includes("submissions")) return "Submissions";
    if (path.includes("review")) return "Review & Approval";
    if (path.includes("reports")) return "Reports";
    if (path.includes("notifications")) return "Notifications";
    return "Dashboard";
  };

  return (
    <header className="top-header">
      {/* BREADCRUMB */}
      <div className="breadcrumb">
        <span>EduVerse</span>
        <ChevronRight size={15} />
        <strong>{getPageTitle(location.pathname)}</strong>
      </div>

      <div className="header-actions">
        {/* Data is reloaded from the backend when a page is opened. */}
        <div className="sync-status">
          Database-backed · refresh on entry
        </div>

        {/* SEARCH */}
        <div className="header-search">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search criteria, metrics..."
          />
        </div>

        {/* NOTIFICATIONS */}
        <button
          className="header-icon"
          type="button"
          title="Notifications"
        >
          <Bell size={19} />
          <span className="notification-dot"></span>
        </button>

        {/* HELP */}
        <button
          className="header-icon"
          type="button"
          title="Help"
        >
          <HelpCircle size={19} />
        </button>

        {/* USER PILL */}
        <div className="admin-pill">
          <div className="admin-pill-avatar">
            {user?.name?.charAt(0)?.toUpperCase() ||
              (activeRole
                ? activeRole.charAt(0).toUpperCase()
                : "?")}
          </div>
          <span>{user?.name || activeRole || "Unassigned"}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
