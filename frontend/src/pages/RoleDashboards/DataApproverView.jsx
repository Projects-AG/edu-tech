import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, RotateCcw, CheckSquare } from "lucide-react";

import api from "../../services/api";
import StatCard from "../../components/common/StatCard";
import {
  LoadingState,
  ErrorState,
} from "../../components/common/FeedbackStates";

export const DataApproverView = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/approver/dashboard");
      setData(response.data);
    } catch (err) {
      setData(null);
      setError(
        err?.response?.data?.detail ||
          "Unable to load the data approver dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading approver dashboard..." />;
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
  const userName = data?.user?.name || "Data Approver";

  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">STATUTORY APPROVAL WORKSPACE</div>
          <h1>Welcome, {userName}</h1>
          <p>Statutory sign-off portal for verification of NAAC metrics and evidence dossiers.</p>
        </div>
        <button
          type="button"
          className="primary-action"
          onClick={() => navigate("/submissions")}
        >
          Open submissions
        </button>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
        <StatCard icon={Clock} label="Pending Approvals" value={stats.pending_approvals ?? 0} color="orange" />
        <StatCard icon={RotateCcw} label="Changes Requested" value={stats.changes_requested ?? 0} color="purple" />
        <StatCard icon={CheckCircle2} label="Final Approved" value={stats.final_approved ?? 0} color="green" />
        <StatCard icon={CheckSquare} label="Final Submitted" value={stats.final_submitted ?? 0} color="blue" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected ?? 0} color="red" />
      </div>
    </div>
  );
};

export default DataApproverView;
