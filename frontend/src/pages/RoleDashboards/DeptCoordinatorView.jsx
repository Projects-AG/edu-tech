import React, { useEffect, useState } from "react";
import { Building2, FileText, UploadCloud, Clock, CheckCircle2 } from "lucide-react";

import api from "../../services/api";
import StatCard from "../../components/common/StatCard";
import {
  LoadingState,
  ErrorState,
} from "../../components/common/FeedbackStates";

export const DeptCoordinatorView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/department/dashboard");
      setData(response.data);
    } catch (err) {
      setData(null);
      setError(
        err?.response?.data?.detail ||
          "Unable to load the department dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading department dashboard..." />;
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
  const userName = data?.user?.name || "Department Coordinator";
  const departmentName = data?.department?.name || data?.department?.code || "Unassigned";

  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">DEPARTMENTAL WORKSPACE</div>
          <h1>Welcome, {userName}</h1>
          <p>Track department-level evidence collection and criterion submissions.</p>
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
        <StatCard icon={Building2} label="Department" value={departmentName} color="blue" smallValue />
        <StatCard icon={FileText} label="Total Submissions" value={stats.total_submissions ?? 0} color="purple" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved_submissions ?? 0} color="green" />
        <StatCard icon={Clock} label="Pending" value={stats.pending_submissions ?? 0} color="orange" />
        <StatCard icon={UploadCloud} label="Documents" value={stats.total_documents ?? 0} color="cyan" />
      </div>
    </div>
  );
};

export default DeptCoordinatorView;
