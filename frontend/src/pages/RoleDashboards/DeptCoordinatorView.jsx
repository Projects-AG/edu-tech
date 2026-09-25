import React from "react";
import { Building2, Award, FileText, UploadCloud, Clock, CheckCircle2 } from "lucide-react";
import StatCard from "../../components/common/StatCard";

export const DeptCoordinatorView = () => {
  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">DEPARTMENTAL WORKSPACE</div>
          <h1>Welcome, Department Coordinator</h1>
          <p>Track department-level evidence collection, faculty metrics, and criterion submissions.</p>
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
        <StatCard icon={Building2} label="Department" value="CSE Dept" color="blue" smallValue />
        <StatCard icon={Award} label="Assigned Criteria" value="5" color="purple" />
        <StatCard icon={FileText} label="Documents Required" value="95" color="cyan" />
        <StatCard icon={UploadCloud} label="Collected" value="84" color="green" />
        <StatCard icon={Clock} label="Pending" value="11" color="orange" />
        <StatCard icon={CheckCircle2} label="Submitted" value="26" color="blue" />
      </div>

      <div className="two-column" style={{ marginTop: "22px" }}>
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Department Progress Overview</h2>
              <p>Completion metric against target benchmarks</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>Faculty Publications & Research (Crit 3)</span>
                <strong>88%</strong>
              </div>
              <div className="criterion-bar"><div className="criterion-fill" style={{ width: "88%" }} /></div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>Student Attainment & Results (Crit 2)</span>
                <strong>79%</strong>
              </div>
              <div className="criterion-bar"><div className="criterion-fill" style={{ width: "79%" }} /></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent Activities</h2>
              <p>Latest updates in your department</p>
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b" }}>• Curriculum Feedback analysis report submitted.</p>
          <p style={{ fontSize: "12px", color: "#64748b" }}>• 14 research papers attached for Metric 3.2.</p>
        </div>
      </div>
    </div>
  );
};

export default DeptCoordinatorView;
