import React from "react";
import { Download, PlayCircle, Users, Building2, ShieldCheck, Award, FileText, CheckCircle2, UserPlus, Clock3, AlertCircle } from "lucide-react";
import StatCard from "../../components/common/StatCard";

export const AdminView = () => {
  const criteria = [
    { number: "01", title: "Curricular Aspects", value: 78 },
    { number: "02", title: "Teaching-Learning & Evaluation", value: 64 },
    { number: "03", title: "Research, Innovations & Extension", value: 71 },
    { number: "04", title: "Infrastructure & Learning Resources", value: 59, attention: true },
    { number: "05", title: "Student Support & Progression", value: 73 },
    { number: "06", title: "Governance, Leadership & Management", value: 62 },
    { number: "07", title: "Institutional Values & Best Practices", value: 69 },
  ];

  const roleData = [
    { name: "Platform Administrator", count: 3 },
    { name: "NAAC Steering Coordinator", count: 5 },
    { name: "Dept Coordinator", count: 18 },
    { name: "IQAC Member", count: 32 },
    { name: "External Peer Reviewer", count: 14 },
    { name: "Statutory Approver", count: 8 },
    { name: "Principal / Director", count: 2 },
  ];

  return (
    <div>
      {/* WELCOME BANNER */}
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">ADMINISTRATION OVERVIEW</div>
          <h1>Welcome back, Administrator.</h1>
          <p>Monitor institutional accreditation, users, permissions and compliance from one central workspace.</p>
        </div>
        <div className="welcome-actions">
          <button className="secondary-action" type="button">
            <Download size={17} /> Export SSR Packet
          </button>
          <button className="primary-action" type="button">
            <PlayCircle size={17} /> Initiate Audit Run
          </button>
        </div>
      </section>

      {/* KPI GRID */}
      <section className="kpi-grid">
        <StatCard icon={Users} label="Total Users" value="1,248" color="blue" change="+8.2% this month" />
        <StatCard icon={Users} label="Active Users" value="1,186" color="green" change="95% Active" />
        <StatCard icon={Building2} label="Institutions" value="Autonomous" color="purple" smallValue />
        <StatCard icon={Award} label="Accreditation" value="68% (3.24)" color="orange" change="Projected: A" />
        <StatCard icon={AlertCircle} label="Pending Actions" value="24" color="red" change="Sign-off Required" />
        <StatCard icon={FileText} label="Reports Gen." value="128" color="cyan" change="+12 this cycle" />
      </section>

      {/* TWO COLUMN PANELS */}
      <div className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>NAAC Criteria Progress & Metric Health</h2>
              <p>Seven Criteria quantitative points achieved vs statutory weightage</p>
            </div>
            <button className="view-button" type="button">Detailed Breakdown →</button>
          </div>

          <div className="criteria-list">
            {criteria.map((item) => (
              <div className="criterion-row" key={item.number}>
                <div className="criterion-number">{item.number}</div>
                <div>
                  <div className="criterion-title">
                    <span>{item.title}</span>
                    {item.attention && <span className="attention-badge">Attention Required</span>}
                  </div>
                  <div className={`criterion-bar`}>
                    <div
                      className={`criterion-fill ${item.attention ? "attention-fill" : ""}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
                <div className="criterion-value">{item.value}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel summary-panel">
          <div className="panel-header">
            <div>
              <h2>Institutional Standing</h2>
              <p>Real-time predicted NAAC CGPA</p>
            </div>
          </div>

          <div className="standing-circle">
            <div className="standing-inner">
              <strong>3.24</strong>
              <span>CGPA Score</span>
            </div>
          </div>

          <div className="standing-stats">
            <div>
              <span>Predicted Grade</span>
              <strong className="grade-a">A Grade</strong>
            </div>
            <div>
              <span>Validated Metrics</span>
              <strong>68 / 100</strong>
            </div>
          </div>

          <div className="summary-message">
            <CheckCircle2 size={16} />
            On track to meet target CGPA of 3.51 for A++ status.
          </div>
        </div>
      </div>

      {/* ROLES PANEL */}
      <div className="panel" style={{ marginTop: "18px" }}>
        <div className="panel-header">
          <div>
            <h2>User Role Distribution</h2>
            <p>Active user counts mapped across administrative RBAC roles</p>
          </div>
        </div>
        <div className="roles-list">
          {roleData.map((role) => (
            <div className="role-row" key={role.name}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>{role.name}</span>
              <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "700" }}>{role.count} Active Users</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminView;
