import React from "react";
import PageHeader from "../../components/common/PageHeader";

export const SystemSettings = () => {
  return (
    <div>
      <PageHeader
        eyebrow="SYSTEM CONFIGURATION"
        title="Platform & Audit Settings"
        description="Configure NAAC RAF 2024–26 cycle parameters, audit log retentions, and API integrations."
      />
      <div className="panel">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>Accreditation Cycle</label>
            <input type="text" defaultValue="Cycle 3 (2025-2026)" readOnly style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#f8fafc" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>Benchmark Target CGPA</label>
            <input type="text" defaultValue="3.51 for A++ Grade" readOnly style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#f8fafc" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>FastAPI Backend Base URL</label>
            <input type="text" defaultValue="http://127.0.0.1:8001" readOnly style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#f8fafc" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
