import React from "react";
import { Award, FileText, UploadCloud, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import StatCard from "../../components/common/StatCard";

export const CoordinatorView = () => {
  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">COORDINATOR WORKSPACE</div>
          <h1>Welcome, Naac Coordinator</h1>
          <p>Monitor institution-wide criteria data collection, review status, and accreditation submission readiness.</p>
        </div>
      </section>

      {/* KPI GRID */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <StatCard icon={Award} label="Total Criteria" value="7 / 7" color="blue" />
        <StatCard icon={UploadCloud} label="Documents Collected" value="482" color="green" change="+14 this week" />
        <StatCard icon={Clock} label="Pending Documents" value="28" color="orange" change="Requires Upload" />
        <StatCard icon={FileText} label="Total Submissions" value="142" color="purple" />
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "12px" }}>
        <StatCard icon={Clock} label="Under Review" value="18" color="cyan" />
        <StatCard icon={CheckCircle2} label="Approved" value="116" color="green" change="81.6% Approval Rate" />
        <StatCard icon={XCircle} label="Rejected / Needs Action" value="8" color="red" />
      </div>

      {/* PANELS */}
      <div className="two-column" style={{ marginTop: "22px" }}>
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Institutional Criteria Progress</h2>
              <p>Real-time completion metrics per NAAC Criterion</p>
            </div>
          </div>

          <div className="criteria-list">
            {[
              { num: "C1", title: "Curricular Aspects", val: 85 },
              { num: "C2", title: "Teaching-Learning & Evaluation", val: 68 },
              { num: "C3", title: "Research, Innovations & Extension", val: 74 },
              { num: "C4", title: "Infrastructure & Learning Resources", val: 59 },
              { num: "C5", title: "Student Support & Progression", val: 79 },
              { num: "C6", title: "Governance, Leadership & Management", val: 65 },
              { num: "C7", title: "Institutional Values & Best Practices", val: 72 },
            ].map((c) => (
              <div key={c.num} className="criterion-row">
                <div className="criterion-number">{c.num}</div>
                <div>
                  <div className="criterion-title">
                    <span>{c.title}</span>
                    <strong>{c.val}%</strong>
                  </div>
                  <div className="criterion-bar">
                    <div className="criterion-fill" style={{ width: `${c.val}%` }} />
                  </div>
                </div>
                <div className="criterion-value">{c.val}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Pending Actions & Alerts</h2>
              <p>High-priority items requiring attention</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ padding: "12px", background: "#fff7ed", borderLeft: "4px solid #ea580c", borderRadius: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9a3412", fontWeight: "700", fontSize: "12px" }}>
                <AlertTriangle size={15} />
                Criterion 4 Evidence Audit
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#c2410c" }}>
                Infrastructure expenditure proofs require coordinator sign-off.
              </p>
            </div>

            <div style={{ padding: "12px", background: "#eff6ff", borderLeft: "4px solid #2563eb", borderRadius: "6px" }}>
              <div style={{ fontWeight: "700", fontSize: "12px", color: "#1e40af" }}>
                Department Submissions Review
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#1d4ed8" }}>
                12 AQAR quantitative metrics awaiting steering validation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorView;
