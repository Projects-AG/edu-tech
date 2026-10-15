import React, { useEffect, useState } from "react";
import api from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import {
  LoadingState,
  ErrorState,
} from "../../components/common/FeedbackStates";

export const SystemSettings = () => {
  const [cycle, setCycle] = useState(null);
  const [apiBase, setApiBase] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");
      setApiBase(import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001");

      const response = await api.get("/accreditation-cycles");
      const cycles = Array.isArray(response.data) ? response.data : [];
      const active = cycles.find((item) =>
        ["In Progress", "Active"].includes(item.status)
      ) || cycles.find((item) => item.status !== "Completed") || null;

      setCycle(active);
    } catch (err) {
      setCycle(null);
      setError(
        err?.response?.data?.detail ||
          "Unable to load system settings from the database."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return <LoadingState message="Loading system settings..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load settings"
        message={error}
        onRetry={loadSettings}
      />
    );
  }

  const cycleLabel = cycle
    ? `${cycle.name}${cycle.academic_period ? ` (${cycle.academic_period})` : ""}`
    : "No accreditation cycle configured";

  return (
    <div>
      <PageHeader
        eyebrow="SYSTEM CONFIGURATION"
        title="Platform & Audit Settings"
        description="Current accreditation cycle and API configuration from the live database."
      />
      <div className="panel">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>Accreditation Cycle</label>
            <input type="text" value={cycleLabel} readOnly style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#f8fafc" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>Cycle Status</label>
            <input type="text" value={cycle?.status || "Not configured"} readOnly style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#f8fafc" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>FastAPI Backend Base URL</label>
            <input type="text" value={apiBase} readOnly style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#f8fafc" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
