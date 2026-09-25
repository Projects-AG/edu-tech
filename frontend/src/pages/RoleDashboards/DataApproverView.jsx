import React from "react";
import { CheckSquare, Clock, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import StatCard from "../../components/common/StatCard";

export const DataApproverView = () => {
  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">STATUTORY APPROVAL WORKSPACE</div>
          <h1>Welcome, Data Approver</h1>
          <p>Statutory sign-off portal for final verification of NAAC metrics and evidence dossiers.</p>
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
        <StatCard icon={Clock} label="Pending Approvals" value="14" color="orange" change="Sign-off Needed" />
        <StatCard icon={CheckCircle2} label="Approved" value="128" color="green" />
        <StatCard icon={XCircle} label="Rejected" value="5" color="red" />
        <StatCard icon={RotateCcw} label="Returned for Edits" value="8" color="purple" />
        <StatCard icon={CheckSquare} label="Total Submissions" value="155" color="blue" />
      </div>

      <div className="panel" style={{ marginTop: "22px" }}>
        <div className="panel-header">
          <div>
            <h2>Pending Approval Queue</h2>
            <p>Institutional dossiers awaiting statutory validation</p>
          </div>
        </div>
        <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: "13px", color: "#1e293b" }}>Criterion 4 Infrastructure Audit Sheet</strong>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Audited by: IQAC Steering | Status: Pending Final Approver Sign-off</div>
          </div>
          <button style={{ padding: "6px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
            Sign-off Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataApproverView;
