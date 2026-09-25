import React from "react";
import { Award, FileText, UploadCloud, Clock, CheckCircle2 } from "lucide-react";
import StatCard from "../../components/common/StatCard";

export const CommitteeMemberView = () => {
  return (
    <div>
      <section className="welcome-banner">
        <div>
          <div className="welcome-eyebrow">COMMITTEE WORKSPACE</div>
          <h1>Welcome, Committee Member</h1>
          <p>Manage your assigned NAAC criteria, upload evidence, and track submission progress.</p>
        </div>
      </section>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
        <StatCard icon={Award} label="Assigned Criteria" value="2 Criteria" color="blue" />
        <StatCard icon={FileText} label="Documents Required" value="45" color="purple" />
        <StatCard icon={UploadCloud} label="Documents Uploaded" value="38" color="green" change="84% Completed" />
        <StatCard icon={Clock} label="Pending Work" value="7" color="orange" />
        <StatCard icon={CheckCircle2} label="Submitted Items" value="18" color="cyan" />
      </div>

      <div className="two-column" style={{ marginTop: "22px" }}>
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>My Assigned Criteria</h2>
              <p>Direct responsibility areas for Criterion evidence</p>
            </div>
          </div>
          <div className="criteria-list">
            <div className="criterion-row">
              <div className="criterion-number">C2</div>
              <div>
                <div className="criterion-title">
                  <span>Teaching-Learning & Evaluation</span>
                  <strong>82%</strong>
                </div>
                <div className="criterion-bar">
                  <div className="criterion-fill" style={{ width: "82%" }} />
                </div>
              </div>
              <div className="criterion-value">82%</div>
            </div>

            <div className="criterion-row">
              <div className="criterion-number">C5</div>
              <div>
                <div className="criterion-title">
                  <span>Student Support & Progression</span>
                  <strong>75%</strong>
                </div>
                <div className="criterion-bar">
                  <div className="criterion-fill" style={{ width: "75%" }} />
                </div>
              </div>
              <div className="criterion-value">75%</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Pending Tasks</h2>
              <p>Action items requiring your input</p>
            </div>
          </div>
          <ul style={{ paddingLeft: "20px", fontSize: "12px", color: "#334155", lineHeight: "1.8" }}>
            <li>Upload student placement offer letters for 2024-25 batch.</li>
            <li>Submit mentoring register evidence for Criterion 2.3.</li>
            <li>Verify alumni feedback survey response spreadsheets.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CommitteeMemberView;
