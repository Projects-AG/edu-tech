import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getNavigationForRole } from "../../config/navigation";

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activeRole, logout } = useAuth();

  const navItems = getNavigationForRole(activeRole);

  const handleNavigate = (path) => {
    if (setMobileOpen) setMobileOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <aside className={`admin-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      {/* BRAND */}
      <div className="sidebar-brand">
        <div className="brand-icon">E</div>
        <div>
          <div className="brand-name">EduVerse</div>
          <div className="brand-subtitle">NAAC PLATFORM</div>
        </div>
      </div>

      {/* DYNAMIC NAVIGATION SECTION */}
      <div className="sidebar-section">
        <div className="sidebar-label">{activeRole.toUpperCase()} PORTAL</div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.label + item.path}
              className={`sidebar-item ${isActive ? "active" : ""}`}
              onClick={() => handleNavigate(item.path)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACCREDITATION PREPARATION CYCLE CARD */}
      <div className="cycle-card">
        <div className="cycle-top">
          <span>Cycle 3 Prep</span>
          <span>78%</span>
        </div>

        <div className="cycle-progress">
          <div className="cycle-progress-fill" style={{ width: "78%" }} />
        </div>

        <p>Accreditation preparation is on track.</p>
      </div>

      {/* USER PROFILE */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.name?.charAt(0)?.toUpperCase() || activeRole.charAt(0).toUpperCase()}
        </div>

        <div className="user-info">
          <strong>{user?.name || activeRole}</strong>
          <span>{activeRole}</span>
        </div>

        <button className="logout-icon" onClick={handleLogout} title="Logout">
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
