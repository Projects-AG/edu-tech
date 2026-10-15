import React, { useEffect, useState } from "react";
import { Users, Building2, ShieldCheck, Award, FileText, AlertCircle } from "lucide-react";

import api from "../../services/api";
import StatCard from "../../components/common/StatCard";
import {
  LoadingState,
  ErrorState,
} from "../../components/common/FeedbackStates";

export const AdminView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/admin/dashboard");
      setData(response.data);
    } catch (err) {
      setData(null);
      setError(
        err?.response?.data?.detail ||
          "Unable to load the admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading admin dashboard..." />;
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

  const stats = data?.statistics || {};
  const userName = data?.user?.name || "Administrator";

  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">ADMINISTRATION OVERVIEW</div>
          <h1>Welcome back, {userName}.</h1>
          <p>Monitor institutional accreditation, users, permissions and compliance from one central workspace.</p>
        </div>
      </section>

      <section className="kpi-grid">
        <StatCard icon={Users} label="Total Users" value={stats.total_users ?? 0} color="blue" />
        <StatCard icon={Users} label="Active Users" value={stats.active_users ?? 0} color="green" />
        <StatCard icon={Building2} label="Institutions" value={stats.total_institutions ?? 0} color="purple" />
        <StatCard icon={Award} label="Accreditation Cycles" value={stats.total_accreditation_cycles ?? 0} color="orange" />
        <StatCard icon={AlertCircle} label="Pending Registrations" value={stats.pending_registration_requests ?? 0} color="red" />
        <StatCard icon={ShieldCheck} label="Roles" value={stats.total_roles ?? 0} color="cyan" />
        <StatCard icon={FileText} label="Modules" value={stats.total_modules ?? 0} color="blue" />
      </section>
    </div>
  );
};

export default AdminView;
