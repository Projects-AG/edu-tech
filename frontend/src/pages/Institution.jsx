import React, { useState, useEffect } from "react";
import institutionService from "../services/institutionService";
import PageHeader from "../components/common/PageHeader";
import { Building, ShieldCheck, CheckCircle2 } from "lucide-react";

export const Institution = () => {
  const [institutions, setInstitutions] = useState([]);

  useEffect(() => {
    institutionService.getInstitutions().then(setInstitutions);
  }, []);

  const currentInst = institutions[0] || {
    name: "EduVerse Institute of Technology & Science",
    code: "EITS-2026",
    city: "Mumbai",
    state: "Maharashtra",
    institution_type: "Autonomous College",
    status: "Verified",
  };

  return (
    <div>
      <PageHeader eyebrow="INSTITUTION PROFILE" title="Institutional Overview" description="Governing details, NAAC accreditation cycle status, and accreditation certificates." />
      <div className="panel">
        <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ width: "60px", height: "60px", background: "#2563eb", borderRadius: "14px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "800" }}>
            E
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>{currentInst.name}</h2>
            <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
              <span>Code: <strong>{currentInst.code}</strong></span>
              <span>Location: <strong>{currentInst.city}, {currentInst.state}</strong></span>
              <span>Type: <strong>{currentInst.institution_type}</strong></span>
            </div>
          </div>
        </div>

        <div className="standing-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div>
            <span>Accreditation Cycle</span>
            <strong>Cycle 3 SSR Stage</strong>
          </div>
          <div>
            <span>Compliance Standard</span>
            <strong style={{ color: "#16a34a" }}>NAAC RAF 2024–26</strong>
          </div>
          <div>
            <span>Verification Status</span>
            <strong style={{ color: "#2563eb" }}>Full Statutory Verification</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Institution;
