import React from "react";
import { CheckSquare, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import StatCard from "../../components/common/StatCard";

export const ReviewerView = () => {
  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">REVIEWER WORKSPACE</div>
          <h1>Welcome, Peer Reviewer</h1>
          <p>Review submitted criteria documentation, evaluate compliance, and approve/reject evidence.</p>
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
        <StatCard icon={CheckSquare} label="Assigned Reviews" value="28" color="blue" />
        <StatCard icon={Clock} label="Pending Reviews" value="9" color="orange" change="Requires Action" />
        <StatCard icon={FileText} label="Reviewed" value="19" color="purple" />
        <StatCard icon={CheckCircle2} label="Approved" value="16" color="green" />
        <StatCard icon={XCircle} label="Rejected" value="3" color="red" />
      </div>

      <div className="panel" style={{ marginTop: "22px" }}>
        <div className="panel-header">
          <div>
            <h2>Pending Review Queue</h2>
            <p>Submissions awaiting your evaluation and comments</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "13px", color: "#1e293b" }}>AQAR Quantitative Metrics 2.3</strong>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Department: CSE | Submitted: 2026-03-05</div>
            </div>
            <button style={{ padding: "6px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
              Evaluate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewerView;
