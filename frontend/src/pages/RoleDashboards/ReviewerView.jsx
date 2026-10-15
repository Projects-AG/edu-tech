import React, { useEffect, useState } from "react";
import { Clock, CheckCircle2, FileText } from "lucide-react";

import api from "../../services/api";
import StatCard from "../../components/common/StatCard";
import {
  LoadingState,
  ErrorState,
} from "../../components/common/FeedbackStates";

export const ReviewerView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/reviewer/dashboard");
      setData(response.data);
    } catch (err) {
      setData(null);
      setError(
        err?.response?.data?.detail ||
          "Unable to load the reviewer dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading reviewer dashboard..." />;
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
  const userName = data?.user?.name || "Reviewer";

  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">REVIEWER WORKSPACE</div>
          <h1>Welcome, {userName}</h1>
          <p>Review submitted criteria documentation and evaluate compliance.</p>
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        <StatCard icon={Clock} label="Pending Reviews" value={stats.pending_reviews ?? 0} color="orange" />
        <StatCard icon={CheckCircle2} label="Completed Reviews" value={stats.completed_reviews ?? 0} color="green" />
        <StatCard icon={FileText} label="Evidence Items" value={stats.evidence_items ?? 0} color="purple" />
      </div>
    </div>
  );
};

export default ReviewerView;
