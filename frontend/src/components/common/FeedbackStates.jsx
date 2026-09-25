import React from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

export const LoadingState = ({ message = "Loading data..." }) => (
  <div style={{ padding: "50px", textAlign: "center", color: "#2563eb" }}>
    <Loader2 size={28} className="spin" style={{ animation: "spin 1s linear infinite" }} />
    <p style={{ marginTop: "10px", fontSize: "13px", color: "#64748b" }}>{message}</p>
  </div>
);

export const EmptyState = ({ title = "No Data Found", message = "There are no records to display at this time." }) => (
  <div style={{ padding: "50px", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
    <Inbox size={36} style={{ color: "#94a3b8", marginBottom: "10px" }} />
    <h3 style={{ margin: "0", fontSize: "15px", color: "#1e293b" }}>{title}</h3>
    <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#64748b" }}>{message}</p>
  </div>
);

export const ErrorState = ({ title = "Unable to load content", message = "An error occurred while fetching data.", onRetry }) => (
  <div style={{ padding: "40px", textAlign: "center", background: "#fef2f2", borderRadius: "12px", border: "1px solid #fecaca" }}>
    <AlertCircle size={32} style={{ color: "#dc2626", marginBottom: "8px" }} />
    <h3 style={{ margin: "0", fontSize: "15px", color: "#991b1b" }}>{title}</h3>
    <p style={{ margin: "5px 0 15px", fontSize: "12px", color: "#7f1d1d" }}>{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          padding: "8px 16px",
          background: "#dc2626",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        Try Again
      </button>
    )}
  </div>
);
