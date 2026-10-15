import React, { useEffect, useState } from "react";
import { Award, Clock, CheckCircle2, FileText, UploadCloud, PieChart } from "lucide-react";

import api from "../../services/api";
import StatCard from "../../components/common/StatCard";
import {
  LoadingState,
  ErrorState,
} from "../../components/common/FeedbackStates";

export const CoordinatorView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/coordinator/dashboard");
      setData(response.data);
    } catch (err) {
      setData(null);
      setError(
        err?.response?.data?.detail ||
          "Unable to load the coordinator dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading coordinator dashboard..." />;
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
  const userName = data?.user?.name || "NAAC Coordinator";
  const institutionName = data?.institution?.name;

  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">COORDINATOR WORKSPACE</div>
          <h1>Welcome, {userName}</h1>
          <p>
            {institutionName
              ? `Accreditation cycle status for ${institutionName}.`
              : "Monitor accreditation cycle status for your institution."}
          </p>
          {stats.eligibility_status === "UNVERIFIED" ||
          (stats.eligibility_status === "NOT_READY" &&
            data?.final_report?.naac_required_optional_verified === false) ? (
            <p style={{ marginTop: "8px", fontSize: "13px", color: "#92400e" }}>
              {data?.final_report?.reason ||
                "Official required, optional, and not-applicable rules are unverified. The final internal progress report is not ready."}
            </p>
          ) : stats.uses_catalog_fallback ? (
            <p style={{ marginTop: "8px", fontSize: "13px", color: "#92400e" }}>
              {stats.cycle_id
                ? "Applicability is not configured for the current accreditation cycle. Progress uses the global metric catalog."
                : "No active accreditation cycle is configured. Progress uses the global metric catalog."}
            </p>
          ) : null}
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <StatCard icon={Award} label="Total Cycles" value={stats.total_accreditation_cycles ?? 0} color="blue" />
        <StatCard icon={Clock} label="Active Cycles" value={stats.active_cycles ?? 0} color="orange" />
        <StatCard icon={FileText} label="Total Submissions" value={stats.total_submissions ?? 0} color="purple" />
        <StatCard icon={CheckCircle2} label="Approved Submissions" value={stats.approved_submissions ?? 0} color="green" />
        <StatCard icon={UploadCloud} label="Evidence Documents" value={stats.total_evidence ?? 0} color="cyan" />
        <StatCard icon={PieChart} label="Overall Progress" value={`${stats.overall_completion_percentage ?? 0}%`} color="blue" />
      </div>
    </div>
  );
};

export default CoordinatorView;
