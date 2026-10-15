import React, { useEffect, useState } from "react";
import auditService from "../services/auditService";
import PageHeader from "../components/common/PageHeader";
import DataTable from "../components/common/DataTable";
import {
  LoadingState,
  ErrorState,
} from "../components/common/FeedbackStates";

const formatJson = (value) => {
  if (!value || (typeof value === "object" && Object.keys(value).length === 0)) {
    return "—";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await auditService.getAuditLogs({
        action: action || undefined,
        entityType: entityType || undefined,
      });
      setLogs(data);
    } catch (err) {
      setLogs([]);
      setError(
        err?.response?.data?.detail ||
          "Unable to load audit logs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const columns = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      render: (value) =>
        value ? new Date(value).toLocaleString("en-IN") : "—",
    },
    {
      title: "User",
      dataIndex: "user_name",
      render: (value, row) => value || row.user_email || "—",
    },
    { title: "Action", dataIndex: "action" },
    { title: "Entity", dataIndex: "entity_type" },
    { title: "Entity ID", dataIndex: "entity_id" },
    {
      title: "Old values",
      dataIndex: "old_values",
      render: formatJson,
    },
    {
      title: "New values",
      dataIndex: "new_values",
      render: formatJson,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="COMPLIANCE"
        title="Audit Logs"
        description="Business actions recorded for this institution."
      />

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <input
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="Filter by action"
          style={{
            padding: "8px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            minWidth: "180px",
          }}
        />
        <input
          value={entityType}
          onChange={(event) => setEntityType(event.target.value)}
          placeholder="Filter by entity type"
          style={{
            padding: "8px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            minWidth: "180px",
          }}
        />
        <button
          type="button"
          onClick={loadLogs}
          style={{
            padding: "8px 14px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Apply filters
        </button>
      </div>

      {loading ? (
        <LoadingState message="Loading audit logs..." />
      ) : error ? (
        <ErrorState
          title="Unable to load audit logs"
          message={error}
          onRetry={loadLogs}
        />
      ) : (
        <div className="panel" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
          <DataTable
            columns={columns}
            data={logs}
            keyField="id"
            emptyMessage="No audit logs found."
          />
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
