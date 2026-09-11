import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CriteriaListPage from './pages/criteria/CriteriaListPage';
import CriterionDetailPage from './pages/criteria/CriterionDetailPage';
import MetricDetailPage from './pages/criteria/MetricDetailPage';
import EvidenceLibraryPage from './pages/evidence/EvidenceLibraryPage';
import EvidenceUploadPage from './pages/evidence/EvidenceUploadPage';
import DataEntryPage from './pages/dataEntry/DataEntryPage';
import TasksPage from './pages/tasks/TasksPage';
import ReviewsPage from './pages/reviews/ReviewsPage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import UsersPage from './pages/users/UsersPage';
import DepartmentsPage from './pages/departments/DepartmentsPage';
import AuditPage from './pages/audit/AuditPage';
import SettingsPage from './pages/settings/SettingsPage';
import { APP_HOME, ROLES } from './utils/roles';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppShell />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="criteria" element={<CriteriaListPage />} />
                <Route path="criteria/:criterionId" element={<CriterionDetailPage />} />
                <Route path="metrics/:metricId" element={<MetricDetailPage />} />
                <Route path="evidence" element={<EvidenceLibraryPage />} />
                <Route path="evidence/upload" element={<EvidenceUploadPage />} />
                <Route
                  element={
                    <RoleRoute
                      allowedRoles={[
                        ROLES.IQAC_COORDINATOR,
                        ROLES.CRITERION_INCHARGE,
                        ROLES.DEPARTMENT_CONTRIBUTOR,
                        ROLES.FACULTY,
                        ROLES.ADMIN,
                      ]}
                    />
                  }
                >
                  <Route path="data-entry" element={<DataEntryPage />} />
                </Route>
                <Route path="tasks" element={<TasksPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />

                <Route
                  element={
                    <RoleRoute
                      allowedRoles={[
                        ROLES.ADMIN,
                        ROLES.IQAC_COORDINATOR,
                        ROLES.CRITERION_INCHARGE,
                        ROLES.REVIEWER,
                        ROLES.FINAL_APPROVER,
                      ]}
                    />
                  }
                >
                  <Route path="reviews" element={<ReviewsPage />} />
                </Route>

                <Route
                  element={
                    <RoleRoute
                      allowedRoles={[
                        ROLES.ADMIN,
                        ROLES.IQAC_COORDINATOR,
                        ROLES.CRITERION_INCHARGE,
                        ROLES.FINAL_APPROVER,
                        ROLES.REVIEWER,
                      ]}
                    />
                  }
                >
                  <Route path="reports" element={<ReportsPage />} />
                </Route>

                <Route
                  element={
                    <RoleRoute
                      allowedRoles={[
                        ROLES.ADMIN,
                        ROLES.IQAC_COORDINATOR,
                        ROLES.CRITERION_INCHARGE,
                        ROLES.FINAL_APPROVER,
                      ]}
                    />
                  }
                >
                  <Route path="departments" element={<DepartmentsPage />} />
                </Route>

                <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.IQAC_COORDINATOR]} />}>
                  <Route path="users" element={<UsersPage />} />
                  <Route path="audit" element={<AuditPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="/dashboard" element={<Navigate to={APP_HOME} replace />} />
            <Route path="/dashboard/*" element={<Navigate to={APP_HOME} replace />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
