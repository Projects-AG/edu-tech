import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronRight, Search, Bell, HelpCircle, Shield, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ALL_ROLES } from "../../config/roles";

export const Header = () => {
  const location = useLocation();
  const { user, activeRole, devRole, setDevRole, isDev } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

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
        {/* DEV MODE ROLE SWITCHER */}
        {isDev && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 10px",
                background: "#f5f3ff",
                border: "1px solid #ddd6fe",
                borderRadius: "20px",
                color: "#6d28d9",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer",
              }}
              title="Dev Mode Role Switcher (Frontend Testing Only)"
            >
              <Shield size={14} />
              <span>TEST ROLE: {activeRole}</span>
              <ChevronDown size={14} />
            </button>

            {roleDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 2000,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "6px",
                  width: "200px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    color: "#94a3b8",
                    padding: "4px 8px 6px",
                    letterSpacing: "0.5px",
                  }}
                >
                  DEV ROLE TESTER
                </div>
                {ALL_ROLES.map((roleOption) => (
                  <button
                    key={roleOption}
                    type="button"
                    onClick={() => {
                      setDevRole(roleOption);
                      setRoleDropdownOpen(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      border: "none",
                      background: activeRole === roleOption ? "#ede9fe" : "transparent",
                      color: activeRole === roleOption ? "#6d28d9" : "#334155",
                      fontWeight: activeRole === roleOption ? "700" : "400",
                      fontSize: "12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      marginBottom: "2px",
                    }}
                  >
                    {roleOption}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LIVE SYNC STATUS */}
        <div className="sync-status">
          <span className="sync-dot"></span>
          Live Synced
        </div>

        {/* SEARCH */}
        <div className="header-search">
          <Search size={17} />
          <input type="text" placeholder="Search criteria, metrics..." />
        </div>

        {/* NOTIFICATIONS */}
        <button className="header-icon" type="button" title="Notifications">
          <Bell size={19} />
          <span className="notification-dot"></span>
        </button>

        {/* HELP */}
        <button className="header-icon" type="button" title="Help">
          <HelpCircle size={19} />
        </button>

        {/* USER PILL */}
        <div className="admin-pill">
          <div className="admin-pill-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || activeRole.charAt(0).toUpperCase()}
          </div>
          <span>{user?.name || activeRole}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
