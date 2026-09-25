import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  ClipboardCheck,
} from "lucide-react";

import api from "../../services/api";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    checkAdminAccess();
    fetchPendingRequests();
  }, []);

  const checkAdminAccess = () => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (!token) {
      navigate("/");
      return;
    }

    try {
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;

      if (!parsedUser) {
        navigate("/");
        return;
      }

      if (parsedUser.role !== "Admin") {
        navigate("/dashboard");
        return;
      }

      setAdminUser(parsedUser);
    } catch (error) {
      console.error("Unable to read stored user:", error);
      localStorage.clear();
      navigate("/");
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true);

      const response = await api.get("/admin/registration-requests");

      const requests = Array.isArray(response.data)
        ? response.data
        : response.data?.items || response.data?.requests || [];

      const pendingCount = requests.filter(
        (request) =>
          String(request.status || "").toUpperCase() === "PENDING"
      ).length;

      setPendingRequests(pendingCount);
    } catch (error) {
      console.error("Failed to fetch registration requests:", error);
      setPendingRequests(0);
    } finally {
      setLoadingRequests(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedRole");

    navigate("/");
  };

  const goTo = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="admin-dashboard-page">

      {/* ================= SIDEBAR ================= */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? "open" : ""}`}>

        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">E</div>

          <div>
            <h2>EduVerse</h2>
            <span>NAAC ACCREDITATION</span>
          </div>
        </div>

        <div className="sidebar-section-title">
          MAIN MENU
        </div>

        <nav className="sidebar-nav">

          <button
            className="sidebar-item active"
            onClick={() => goTo("/admin-dashboard")}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            className="sidebar-item"
            onClick={() => goTo("/institutions")}
          >
            <Building2 size={18} />
            <span>Institution Management</span>
          </button>

          {/* USER MANAGEMENT */}
          <button
            className="sidebar-item"
            onClick={() => goTo("/admin/registration-requests")}
          >
            <Users size={18} />
            <span>User Management</span>

            {pendingRequests > 0 && (
              <span className="sidebar-badge">
                {pendingRequests}
              </span>
            )}
          </button>

          <button
            className="sidebar-item"
            onClick={() => goTo("/admin/roles")}
          >
            <ShieldCheck size={18} />
            <span>Role & Permissions</span>
          </button>

          <button
            className="sidebar-item"
            onClick={() => goTo("/documents")}
          >
            <FileText size={18} />
            <span>Documents</span>
          </button>

          <button
            className="sidebar-item"
            onClick={() => goTo("/reports")}
          >
            <BarChart3 size={18} />
            <span>Reports & Analytics</span>
          </button>

        </nav>

        <div className="sidebar-section-title">
          SYSTEM
        </div>

        <nav className="sidebar-nav">

          <button
            className="sidebar-item"
            onClick={() => goTo("/notifications")}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </button>

          <button
            className="sidebar-item"
            onClick={() => goTo("/admin/settings")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

        </nav>

        {/* SIDEBAR USER */}
        <div className="sidebar-bottom">

          <div className="sidebar-user">

            <div className="sidebar-user-avatar">
              {adminUser?.name
                ? adminUser.name.charAt(0).toUpperCase()
                : "A"}
            </div>

            <div className="sidebar-user-info">
              <strong>
                {adminUser?.name || "Administrator"}
              </strong>

              <span>
                {adminUser?.role || "Admin"}
              </span>
            </div>

          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            <LogOut size={17} />
            Logout
          </button>

        </div>

      </aside>

      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ================= MAIN ================= */}
      <main className="admin-main">

        {/* HEADER */}
        <header className="admin-header">

          <div className="header-left">

            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>

            <div>
              <div className="breadcrumb">
                Admin
                <ChevronRight size={14} />
                Dashboard
              </div>

              <h1>Admin Dashboard</h1>
            </div>

          </div>

          <div className="header-right">

            <div className="search-box">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search..."
              />
            </div>

            <button className="header-icon">
              <Bell size={19} />
              {pendingRequests > 0 && (
                <span className="notification-dot"></span>
              )}
            </button>

            <div className="header-avatar">
              {adminUser?.name
                ? adminUser.name.charAt(0).toUpperCase()
                : "A"}
            </div>

          </div>

        </header>

        {/* CONTENT */}
        <div className="admin-content">

          {/* WELCOME */}
          <section className="welcome-section">

            <div>
              <div className="welcome-label">
                ADMIN CONTROL CENTER
              </div>

              <h2>
                Welcome back,
                {" "}
                {adminUser?.name || "Administrator"} 👋
              </h2>

              <p>
                Manage institutions, users, roles and
                accreditation activities from one place.
              </p>
            </div>

            <button
              className="primary-action"
              onClick={() =>
                goTo("/admin/registration-requests")
              }
            >
              <UserPlus size={17} />
              Manage User Requests
            </button>

          </section>

          {/* KPI CARDS */}
          <section className="stats-grid">

            <div className="stat-card">

              <div className="stat-icon users-icon">
                <Users size={21} />
              </div>

              <div className="stat-content">
                <span>Total Users</span>
                <strong>1,248</strong>
                <small>
                  <CheckCircle2 size={13} />
                  Active platform users
                </small>
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon active-icon">
                <Activity size={21} />
              </div>

              <div className="stat-content">
                <span>Active Users</span>
                <strong>1,186</strong>
                <small>
                  95.0% active accounts
                </small>
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon institution-icon">
                <Building2 size={21} />
              </div>

              <div className="stat-content">
                <span>Institution</span>
                <strong>Configured</strong>
                <small>
                  SKNCOE
                </small>
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon accreditation-icon">
                <ClipboardCheck size={21} />
              </div>

              <div className="stat-content">
                <span>Accreditation</span>
                <strong>68%</strong>
                <small>
                  Overall progress
                </small>
              </div>

            </div>

          </section>

          {/* PENDING REQUEST BANNER */}
          {pendingRequests > 0 && (
            <section className="pending-request-banner">

              <div className="pending-banner-icon">
                <Clock size={22} />
              </div>

              <div className="pending-banner-content">
                <strong>
                  {pendingRequests} registration{" "}
                  {pendingRequests === 1
                    ? "request"
                    : "requests"}{" "}
                  awaiting approval
                </strong>

                <span>
                  Review the submitted registration requests
                  and assign the appropriate role.
                </span>
              </div>

              <button
                onClick={() =>
                  goTo("/admin/registration-requests")
                }
              >
                Review Requests
                <ChevronRight size={16} />
              </button>

            </section>
          )}

          {/* QUICK OVERVIEW */}
          <section className="dashboard-section">

            <div className="section-heading">

              <div>
                <span>OVERVIEW</span>
                <h3>System Overview</h3>
              </div>

              <button
                onClick={() =>
                  goTo("/admin/registration-requests")
                }
              >
                View User Requests
                <ChevronRight size={15} />
              </button>

            </div>

            <div className="overview-grid">

              <div className="overview-card">

                <div className="overview-card-top">
                  <div className="overview-icon">
                    <UserPlus size={20} />
                  </div>

                  <span className="overview-status pending">
                    LIVE
                  </span>
                </div>

                <h4>User Registration</h4>

                <p>
                  Monitor new account requests submitted
                  by institution users.
                </p>

                <div className="overview-number">
                  {loadingRequests
                    ? "..."
                    : pendingRequests}
                </div>

                <span className="overview-label">
                  Pending Requests
                </span>

                <button
                  className="overview-action"
                  onClick={() =>
                    goTo("/admin/registration-requests")
                  }
                >
                  Open Registration Requests
                  <ChevronRight size={15} />
                </button>

              </div>

              <div className="overview-card">

                <div className="overview-card-top">
                  <div className="overview-icon">
                    <ShieldCheck size={20} />
                  </div>

                  <span className="overview-status">
                    ACTIVE
                  </span>
                </div>

                <h4>Roles & Permissions</h4>

                <p>
                  Control role-based access and permissions
                  across the accreditation platform.
                </p>

                <div className="overview-number">
                  7
                </div>

                <span className="overview-label">
                  System Roles
                </span>

                <button
                  className="overview-action"
                  onClick={() =>
                    goTo("/admin/roles")
                  }
                >
                  Manage Roles
                  <ChevronRight size={15} />
                </button>

              </div>

              <div className="overview-card">

                <div className="overview-card-top">
                  <div className="overview-icon">
                    <Building2 size={20} />
                  </div>

                  <span className="overview-status">
                    CONFIGURED
                  </span>
                </div>

                <h4>Institution Management</h4>

                <p>
                  Configure institution details,
                  departments and accreditation cycles.
                </p>

                <div className="overview-number">
                  01
                </div>

                <span className="overview-label">
                  Institution
                </span>

                <button
                  className="overview-action"
                  onClick={() =>
                    goTo("/institutions")
                  }
                >
                  Manage Institution
                  <ChevronRight size={15} />
                </button>

              </div>

            </div>

          </section>

          {/* ACCREDITATION CRITERIA */}
          <section className="dashboard-section">

            <div className="section-heading">

              <div>
                <span>NAAC</span>
                <h3>Accreditation Progress</h3>
              </div>

              <button
                onClick={() => goTo("/reports")}
              >
                View Reports
                <ChevronRight size={15} />
              </button>

            </div>

            <div className="criteria-grid">

              {[
                ["01", "Curricular Aspects", 72],
                ["02", "Teaching & Learning", 81],
                ["03", "Research & Extension", 64],
                ["04", "Infrastructure", 76],
                ["05", "Student Support", 69],
                ["06", "Governance", 62],
                ["07", "Institutional Values", 55],
              ].map(([number, title, progress]) => (

                <div
                  className="criteria-card"
                  key={number}
                >

                  <div className="criteria-top">
                    <span>{number}</span>

                    <strong>
                      {progress}%
                    </strong>
                  </div>

                  <h4>{title}</h4>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                </div>

              ))}

            </div>

          </section>

          {/* BOTTOM GRID */}
          <section className="bottom-dashboard-grid">

            {/* PENDING ACTIONS */}
            <div className="dashboard-panel">

              <div className="panel-header">

                <div>
                  <span>ACTIONS</span>
                  <h3>Pending Actions</h3>
                </div>

                <AlertCircle size={20} />

              </div>

              <div className="action-list">

                <button
                  className="action-row"
                  onClick={() =>
                    goTo("/admin/registration-requests")
                  }
                >
                  <div className="action-row-icon">
                    <Users size={17} />
                  </div>

                  <div className="action-row-content">
                    <strong>
                      User access requests
                    </strong>

                    <span>
                      New accounts waiting for approval
                    </span>
                  </div>

                  <span className="action-count">
                    {loadingRequests
                      ? "..."
                      : pendingRequests}
                  </span>

                  <ChevronRight size={16} />

                </button>

                <button
                  className="action-row"
                  onClick={() =>
                    goTo("/institutions")
                  }
                >
                  <div className="action-row-icon">
                    <Building2 size={17} />
                  </div>

                  <div className="action-row-content">
                    <strong>
                      Institution configuration
                    </strong>

                    <span>
                      Review institution settings
                    </span>
                  </div>

                  <span className="action-count">
                    1
                  </span>

                  <ChevronRight size={16} />

                </button>

                <button
                  className="action-row"
                  onClick={() =>
                    goTo("/reports")
                  }
                >
                  <div className="action-row-icon">
                    <FileText size={17} />
                  </div>

                  <div className="action-row-content">
                    <strong>
                      Accreditation reports
                    </strong>

                    <span>
                      Reports requiring attention
                    </span>
                  </div>

                  <span className="action-count">
                    3
                  </span>

                  <ChevronRight size={16} />

                </button>

              </div>

            </div>

            {/* ROLE DISTRIBUTION */}
            <div className="dashboard-panel">

              <div className="panel-header">

                <div>
                  <span>ACCESS CONTROL</span>
                  <h3>Role Distribution</h3>
                </div>

                <Users size={20} />

              </div>

              <div className="role-list">

                {[
                  ["NAAC Coordinator", 8],
                  ["Committee Member", 32],
                  ["Dept. Coordinator", 21],
                  ["Reviewer", 14],
                  ["Data Approver", 6],
                  ["Principal / Director", 4],
                  ["Admin", 2],
                ].map(([role, count]) => (

                  <div
                    className="role-row"
                    key={role}
                  >

                    <div>
                      <strong>{role}</strong>

                      <div className="role-progress">
                        <div
                          style={{
                            width: `${Math.min(
                              count * 2,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <span>{count}</span>

                  </div>

                ))}

              </div>

            </div>

          </section>

          {/* FOOTER */}
          <footer className="admin-footer">
            <span>
              © 2026 EduVerse · NAAC Accreditation
              Management System
            </span>

            <span>
              Administrator Control Center
            </span>
          </footer>

        </div>

      </main>
    </div>
  );
};

export default AdminDashboard;