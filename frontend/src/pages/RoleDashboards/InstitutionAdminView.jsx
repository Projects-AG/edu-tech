import React, { useEffect, useState } from "react";
import { Building, Building2, Users } from "lucide-react";

import api from "../../services/api";
import StatCard from "../../components/common/StatCard";
import {
  LoadingState,
  ErrorState,
} from "../../components/common/FeedbackStates";

export const InstitutionAdminView = () => {
  const [institution, setInstitution] = useState(null);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [userCount, setUserCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const institutionResponse = await api.get("/institutions/me");
      setInstitution(institutionResponse.data);

      const departmentsResponse = await api.get("/departments");
      const departments = Array.isArray(departmentsResponse.data)
        ? departmentsResponse.data
        : [];
      setDepartmentCount(departments.length);

      try {
        const usersResponse = await api.get("/admin/users");
        const users = Array.isArray(usersResponse.data)
          ? usersResponse.data
          : usersResponse.data?.users || [];
        setUserCount(users.length);
      } catch {
        setUserCount(null);
      }
    } catch (err) {
      setInstitution(null);
      setDepartmentCount(0);
      setUserCount(null);
      setError(
        err?.response?.data?.detail ||
          "Unable to load the institution admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading institution dashboard..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message={error}
        onRetry={loadDashboard}
      />
    );
  }

  const institutionName = institution?.name || "your institution";

  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">INSTITUTION ADMIN WORKSPACE</div>
          <h1>Institution overview</h1>
          <p>Manage users and departments for {institutionName}.</p>
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        <StatCard icon={Building} label="Institution" value={institutionName} color="blue" smallValue />
        <StatCard icon={Building2} label="Departments" value={departmentCount} color="purple" />
        <StatCard
          icon={Users}
          label="Users"
          value={userCount ?? "—"}
          color="green"
        />
      </div>
    </div>
  );
};

export default InstitutionAdminView;
