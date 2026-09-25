import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/layout/DashboardLayout";

// =========================================
// PUBLIC PAGES
// =========================================
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";

// =========================================
// CORE PAGES
// =========================================
import Dashboard from "../pages/Dashboard";
import Departments from "../pages/Departments";
import Criteria from "../pages/Criteria";
import CriterionDetail from "../pages/CriterionDetail";
import MetricDetail from "../pages/MetricDetail";
import MetricSubmission from "../pages/MetricSubmission";
import Documents from "../pages/Documents";
import EvidenceUpload from "../pages/EvidenceUpload";
import Submissions from "../pages/Submissions";
import Review from "../pages/Review";
import Reports from "../pages/Reports";
import Notifications from "../pages/Notifications";
import Institution from "../pages/Institution";
import Unauthorized from "../pages/Unauthorized";

// =========================================
// REVIEWER PAGES
// =========================================
import ReviewerQueue from "../pages/Reviews/ReviewerQueue";
import EvidenceReview from "../pages/Reviews/EvidenceReview";

// =========================================
// ADMIN PAGES
// =========================================
import InstitutionManagement from "../pages/Admin/InstitutionManagement";
import InstitutionRequests from "../pages/Admin/InstitutionRequests";
import UserManagement from "../pages/Admin/UserManagement";
import RolePermissions from "../pages/Admin/RolePermissions";
import SystemSettings from "../pages/Admin/SystemSettings";
import RegistrationRequests from "../pages/Admin/RegistrationRequests";

// =========================================
// PROTECTED ROUTE GUARD
// =========================================
const ProtectedRoute = ({
  children,
  permission,
  role,
  roles,
}) => {
  const {
    isAuthenticated,
    activeRole,
    hasPermission,
  } = useAuth();

  // =========================================
  // NOT LOGGED IN
  // =========================================
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // =========================================
  // SINGLE ROLE RESTRICTION
  // =========================================
  if (role) {
    if (
      activeRole !== role &&
      activeRole !== "Admin"
    ) {
      return (
        <Navigate
          to="/unauthorized"
          replace
        />
      );
    }
  }

  // =========================================
  // MULTIPLE ROLE RESTRICTION
  // =========================================
  if (roles && roles.length > 0) {
    const hasAllowedRole =
      roles.includes(activeRole);

    if (
      !hasAllowedRole &&
      activeRole !== "Admin"
    ) {
      return (
        <Navigate
          to="/unauthorized"
          replace
        />
      );
    }
  }

  // =========================================
  // PERMISSION RESTRICTION
  // =========================================
  if (
    permission &&
    !hasPermission(permission) &&
    activeRole !== "Admin"
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return children;
};

// =========================================
// APPLICATION ROUTES
// =========================================
export const AppRoutes = () => {
  return (
    <Routes>

      {/* =========================================
          PUBLIC ROUTES
      ========================================= */}

      <Route
        path="/"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      {/* =========================================
          PROTECTED APPLICATION
          DashboardLayout wraps all logged-in pages
      ========================================= */}

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >

        {/* =========================================
            GENERAL / DASHBOARD
        ========================================= */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/admin-dashboard"
          element={<Dashboard />}
        />

        {/* =========================================
            INSTITUTION MANAGEMENT
            ADMIN ONLY
        ========================================= */}

        <Route
          path="/institutions"
          element={
            <ProtectedRoute role="Admin">
              <InstitutionManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/institutions"
          element={
            <ProtectedRoute role="Admin">
              <InstitutionManagement />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            INSTITUTION REQUESTS
            ADMIN ONLY
        ========================================= */}

        <Route
          path="/admin/institution-requests"
          element={
            <ProtectedRoute role="Admin">
              <InstitutionRequests />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            DEPARTMENTS
            ADMIN + INSTITUTION ADMIN
        ========================================= */}

        <Route
          path="/departments"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "Institution Admin",
              ]}
            >
              <Departments />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            NAAC CRITERIA
        ========================================= */}

        <Route
          path="/criteria"
          element={<Criteria />}
        />

        {/* =========================================
            CRITERION DETAIL
        ========================================= */}

        <Route
          path="/criteria/:criterionId"
          element={<CriterionDetail />}
        />

        {/* =========================================
            METRIC DETAIL
        ========================================= */}

        <Route
          path="/criteria/:criterionId/metrics/:metricId"
          element={<MetricDetail />}
        />

        {/* =========================================
            METRIC SUBMISSION
        ========================================= */}

        <Route
          path="/criteria/:criterionId/metrics/:metricId/submit"
          element={<MetricSubmission />}
        />

        {/* =========================================
            DOCUMENTS & EVIDENCE
        ========================================= */}

        <Route
          path="/documents"
          element={<Documents />}
        />

        <Route
          path="/documents/upload"
          element={<EvidenceUpload />}
        />

        {/* =========================================
            SUBMISSIONS
        ========================================= */}

        <Route
          path="/submissions"
          element={<Submissions />}
        />

        {/* =========================================
            REVIEW
        ========================================= */}

        <Route
          path="/review"
          element={<Review />}
        />

        {/* =========================================
            REVIEWER QUEUE
            REVIEWER ONLY

            Shows submissions available for review.
        ========================================= */}

        <Route
          path="/reviewer/queue"
          element={
            <ProtectedRoute role="Reviewer">
              <ReviewerQueue />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            EVIDENCE REVIEW
            REVIEWER ONLY

            Example:
            /reviewer/submissions/12
        ========================================= */}

        <Route
          path="/reviewer/submissions/:id"
          element={
            <ProtectedRoute role="Reviewer">
              <EvidenceReview />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            REPORTS
        ========================================= */}

        <Route
          path="/reports"
          element={<Reports />}
        />

        {/* =========================================
            NOTIFICATIONS
        ========================================= */}

        <Route
          path="/notifications"
          element={<Notifications />}
        />

        {/* =========================================
            INSTITUTION PROFILE
        ========================================= */}

        <Route
          path="/institution"
          element={<Institution />}
        />

        {/* =========================================
            USER MANAGEMENT
            ADMIN + INSTITUTION ADMIN
        ========================================= */}

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "Institution Admin",
              ]}
            >
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            ADMIN - ROLES & PERMISSIONS
            ADMIN ONLY
        ========================================= */}

        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute role="Admin">
              <RolePermissions />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            REGISTRATION REQUESTS

            Allowed:
            Admin
            Principal / Director
            NAAC Coordinator
            Dept. Coordinator
        ========================================= */}

        <Route
          path="/admin/registration-requests"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "Principal / Director",
                "NAAC Coordinator",
                "Dept. Coordinator",
              ]}
            >
              <RegistrationRequests />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            ADMIN - SYSTEM SETTINGS
            ADMIN ONLY
        ========================================= */}

        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute role="Admin">
              <SystemSettings />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            UNAUTHORIZED
        ========================================= */}

        <Route
          path="/unauthorized"
          element={<Unauthorized />}
        />

      </Route>

      {/* =========================================
          FALLBACK
      ========================================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
};

export default AppRoutes;