import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/layout/DashboardLayout";

// =========================================
// PUBLIC PAGES
// =========================================
import Login from "../pages/Login";
import Register from "../pages/Register";

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
import NewSubmission from "../pages/NewSubmission";
import SubmissionDetail from "../pages/SubmissionDetail";
import AccreditationCycles from "../pages/AccreditationCycles";
import Reports from "../pages/Reports";
import AuditLogs from "../pages/AuditLogs";
import Notifications from "../pages/Notifications";
import Institution from "../pages/Institution";
import Unauthorized from "../pages/Unauthorized";

// =========================================
// REVIEWER PAGES
// =========================================
import ReviewerQueue from "../pages/Reviews/ReviewerQueue";
import EvidenceReview from "../pages/Reviews/EvidenceReview";

// =========================================
// COMMITTEE PAGES
// =========================================
import CommitteeList from "../pages/Committees/CommitteeList";
import CommitteeForm from "../pages/Committees/CommitteeForm";
import CommitteeMembers from "../pages/Committees/CommitteeMembers";

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
  if (role && activeRole !== role) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  // =========================================
  // MULTIPLE ROLE RESTRICTION
  // =========================================
  if (roles && roles.length > 0) {
    const hasAllowedRole =
      roles.includes(activeRole);

    if (!hasAllowedRole) {
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
    !hasPermission(permission)
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
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "Institution Admin",
                "NAAC Coordinator",
                "Committee Member",
                "Dept. Coordinator",
                "Reviewer",
                "Data Approver",
                "Principal / Director",
              ]}
            >
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="Admin">
              <Dashboard />
            </ProtectedRoute>
          }
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
                "NAAC Coordinator",
                "Dept. Coordinator",
                "Principal / Director",
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
          element={
            <ProtectedRoute
              roles={[
                "NAAC Coordinator",
                "Committee Member",
                "Dept. Coordinator",
                "Principal / Director",
              ]}
            >
              <Criteria />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            CRITERION DETAIL
        ========================================= */}

        <Route
          path="/criteria/:criterionId"
          element={
            <ProtectedRoute
              roles={[
                "NAAC Coordinator",
                "Committee Member",
                "Dept. Coordinator",
                "Principal / Director",
              ]}
            >
              <CriterionDetail />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            METRIC DETAIL
        ========================================= */}

        <Route
          path="/criteria/:criterionId/metrics/:metricId"
          element={
            <ProtectedRoute
              roles={[
                "NAAC Coordinator",
                "Committee Member",
                "Dept. Coordinator",
                "Principal / Director",
              ]}
            >
              <MetricDetail />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            METRIC SUBMISSION
        ========================================= */}

        <Route
          path="/criteria/:criterionId/metrics/:metricId/submit"
          element={
            <ProtectedRoute
              roles={[
                "NAAC Coordinator",
                "Dept. Coordinator",
              ]}
            >
              <MetricSubmission />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            DOCUMENTS & EVIDENCE
        ========================================= */}

        <Route
          path="/documents"
          element={
            <ProtectedRoute
              roles={[
                "NAAC Coordinator",
                "Dept. Coordinator",
              ]}
            >
              <Documents />
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents/upload"
          element={
            <ProtectedRoute
              roles={[
                "NAAC Coordinator",
                "Dept. Coordinator",
              ]}
            >
              <EvidenceUpload />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            ACCREDITATION CYCLES
        ========================================= */}

        <Route
          path="/accreditation-cycles"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "NAAC Coordinator",
                "Principal / Director",
              ]}
            >
              <AccreditationCycles />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            SUBMISSIONS
        ========================================= */}

        <Route
          path="/submissions/new"
          element={
            <ProtectedRoute
              roles={[
                "NAAC Coordinator",
                "Dept. Coordinator",
              ]}
            >
              <NewSubmission />
            </ProtectedRoute>
          }
        />

        <Route
          path="/submissions/:id"
          element={
            <ProtectedRoute
              roles={[
                "NAAC Coordinator",
                "Committee Member",
                "Dept. Coordinator",
                "Data Approver",
                "Principal / Director",
              ]}
            >
              <SubmissionDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/submissions"
          element={
            <ProtectedRoute
              roles={[
                "NAAC Coordinator",
                "Committee Member",
                "Dept. Coordinator",
                "Data Approver",
                "Principal / Director",
              ]}
            >
              <Submissions />
            </ProtectedRoute>
          }
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
            COMMITTEE MANAGEMENT
            ADMIN + INSTITUTION ADMIN
            + NAAC COORDINATOR
            + PRINCIPAL / DIRECTOR
        ========================================= */}

        <Route
          path="/committees"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "NAAC Coordinator",
              ]}
            >
              <CommitteeList />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            CREATE COMMITTEE
        ========================================= */}

        <Route
          path="/committees/new"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "NAAC Coordinator",
              ]}
            >
              <CommitteeForm />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            EDIT COMMITTEE
            Example:
            /committees/1/edit
        ========================================= */}

        <Route
          path="/committees/:id/edit"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "NAAC Coordinator",
              ]}
            >
              <CommitteeForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/committees/:id/members"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "NAAC Coordinator",
              ]}
            >
              <CommitteeMembers />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            REPORTS
        ========================================= */}

        <Route
          path="/reports"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "NAAC Coordinator",
                "Data Approver",
                "Principal / Director",
              ]}
            >
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "Institution Admin",
                "NAAC Coordinator",
                "Principal / Director",
              ]}
            >
              <AuditLogs />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            NOTIFICATIONS
        ========================================= */}

        <Route
          path="/notifications"
          element={
            <ProtectedRoute
              roles={[
                "Admin",
                "Institution Admin",
                "NAAC Coordinator",
                "Committee Member",
                "Dept. Coordinator",
                "Reviewer",
                "Data Approver",
                "Principal / Director",
              ]}
            >
              <Notifications />
            </ProtectedRoute>
          }
        />

        {/* =========================================
            INSTITUTION PROFILE
        ========================================= */}

        <Route
          path="/institution"
          element={
            <ProtectedRoute
              roles={[
                "Institution Admin",
                "Principal / Director",
              ]}
            >
              <Institution />
            </ProtectedRoute>
          }
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