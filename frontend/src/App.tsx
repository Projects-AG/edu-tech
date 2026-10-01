import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Institutions from "./pages/Institutions";
import Departments from "./pages/Departments";
import AcademicYears from "./pages/AcademicYears";
import FileUpload from "./pages/FileUpload";
import AuditLogs from "./pages/AuditLogs";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" /> : <Register />}
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/institutions" element={<Institutions />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/academic-years" element={<AcademicYears />} />
          <Route path="/files" element={<FileUpload />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
