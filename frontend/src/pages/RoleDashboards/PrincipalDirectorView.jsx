import React from "react";
import { Award, FileText, CheckSquare, Clock, Building, TrendingUp } from "lucide-react";
import StatCard from "../../components/common/StatCard";

export const PrincipalDirectorView = () => {
  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">EXECUTIVE BOARD WORKSPACE</div>
          <h1>Executive Overview — NAAC Accreditation</h1>
          <p>Strategic institutional oversight, grade projection, and overall accreditation progress.</p>
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
        <StatCard icon={TrendingUp} label="Overall NAAC Progress" value="78%" color="blue" change="Target 85% by Oct" />
        <StatCard icon={Award} label="Criteria Completed" value="5 / 7" color="green" />
        <StatCard icon={FileText} label="Documents Submitted" value="482" color="purple" />
        <StatCard icon={Clock} label="Pending Reviews" value="18" color="orange" />
        <StatCard icon={CheckSquare} label="Pending Approvals" value="14" color="cyan" />
      </div>

      <div className="two-column" style={{ marginTop: "22px" }}>
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Projected CGPA & Grade Health</h2>
              <p>Based on current criterion weightages</p>
            </div>
          </div>
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div className="standing-circle">
              <div className="standing-inner">
                <strong>3.24</strong>
                <span>A Grade Projected</span>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Institutional cumulative score indicator based on 68 validated quantitative metrics.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Department-wise Completion</h2>
              <p>Academic unit progress comparison</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { dept: "Computer Science (CSE)", val: 84 },
              { dept: "Electronics & Comm (ECE)", val: 81 },
              { dept: "Mechanical Eng (MECH)", val: 76 },
              { dept: "Civil Engineering", val: 69 },
            ].map((d) => (
              <div key={d.dept}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                  <span>{d.dept}</span>
                  <strong>{d.val}%</strong>
                </div>
                <div className="criterion-bar"><div className="criterion-fill" style={{ width: `${d.val}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrincipalDirectorView;
