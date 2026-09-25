import React, { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

import "../../pages/AdminDashboard.css";

// ============================================================
// DASHBOARD LAYOUT
// ============================================================

export const DashboardLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="admin-dashboard">

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="admin-main">

        {/* Header */}
        <Header />

        {/* Page Content */}
        <div className="dashboard-content">
          {children || <Outlet />}
        </div>

      </main>
    </div>
  );
};

export default DashboardLayout;