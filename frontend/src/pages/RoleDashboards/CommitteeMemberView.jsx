import React, { useEffect, useState } from "react";
import { Award, FileText, UploadCloud, Clock } from "lucide-react";

import api from "../../services/api";
import StatCard from "../../components/common/StatCard";
import {
  LoadingState,
  ErrorState,
} from "../../components/common/FeedbackStates";

const DEPARTMENT_UNASSIGNED_MESSAGE =
  "Your account is not assigned to a department. Please contact an administrator.";

const isDepartmentUnassignedError = (err) => {
  const detail = err?.response?.data?.detail;
  return (
    err?.response?.status === 403 &&
    String(detail || "").includes("User is not assigned to a department")
  );
};

export const CommitteeMemberView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departmentBlocked, setDepartmentBlocked] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      setDepartmentBlocked(false);
      const response = await api.get("/committee/dashboard");
      setData(response.data);
    } catch (err) {
      setData(null);
      if (isDepartmentUnassignedError(err)) {
        setDepartmentBlocked(true);
        setError(DEPARTMENT_UNASSIGNED_MESSAGE);
      } else {
        const detail = err?.response?.data?.detail;
        setError(
          typeof detail === "string"
            ? detail
            : "Unable to load the committee dashboard."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading committee dashboard..." />;
  }

  if (error) {
    return (
      <ErrorState
        title={
          departmentBlocked
            ? "Department assignment required"
            : "Unable to load dashboard"
        }
        message={error}
        onRetry={departmentBlocked ? undefined : loadDashboard}
      />
    );
  }

  const stats = data?.statistics || {};
  const userName = data?.user?.name || "Committee Member";

  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">COMMITTEE WORKSPACE</div>
          <h1>Welcome, {userName}</h1>
          <p>Manage assigned NAAC criteria, upload evidence, and track submission progress.</p>
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <StatCard icon={Award} label="Total Criteria" value={stats.total_criteria ?? 0} color="blue" />
        <StatCard icon={UploadCloud} label="Documents Collected" value={stats.documents_collected ?? 0} color="green" />
        <StatCard icon={FileText} label="Total Submissions" value={stats.total_submissions ?? 0} color="purple" />
        <StatCard icon={Clock} label="Pending Items" value={stats.pending_items ?? 0} color="orange" />
      </div>
    </div>
  );
};

export default CommitteeMemberView;
