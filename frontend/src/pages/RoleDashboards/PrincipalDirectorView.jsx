import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building, FileText, CheckSquare, Award } from "lucide-react";

import api from "../../services/api";
import StatCard from "../../components/common/StatCard";
import {
  LoadingState,
  ErrorState,
} from "../../components/common/FeedbackStates";

export const PrincipalDirectorView = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/principal/dashboard");
      setData(response.data);
    } catch (err) {
      setData(null);
      setError(
        err?.response?.data?.detail ||
          "Unable to load the principal dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading principal dashboard..." />;
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
  const userName = data?.user?.name || "Principal / Director";
  const institutionName = data?.institution?.name || "No institution assigned";

  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">EXECUTIVE BOARD WORKSPACE</div>
          <h1>Executive Overview — {userName}</h1>
          <p>Strategic oversight for {institutionName}.</p>
        </div>
        <div className="welcome-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={() => navigate("/submissions")}
          >
            Open submissions
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={() => navigate("/reports")}
          >
            Open reports
          </button>
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <StatCard icon={Building} label="Departments" value={stats.total_departments ?? 0} color="blue" />
        <StatCard icon={FileText} label="Total Submissions" value={stats.total_submissions ?? 0} color="purple" />
        <StatCard icon={CheckSquare} label="Approved Submissions" value={stats.approved_submissions ?? 0} color="green" />
        <StatCard icon={Award} label="Active Cycles" value={stats.active_cycles ?? 0} color="orange" />
      </div>
    </div>
  );
};

export default PrincipalDirectorView;
