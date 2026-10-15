import React, { useState, useEffect } from "react";
import institutionService from "../services/institutionService";
import { frameworkReadinessText } from "../services/frameworkReadiness";
import PageHeader from "../components/common/PageHeader";

export const Institution = () => {
  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInstitution = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await institutionService.getMyInstitution();
        setInstitution(data);
      } catch (err) {
        console.error("Failed to load institution:", err);
        setInstitution(null);
        setError(err.message || "Unable to load institution.");
      } finally {
        setLoading(false);
      }
    };

    loadInstitution();
  }, []);

  return (
    <div>
      <PageHeader eyebrow="INSTITUTION PROFILE" title="Institutional Overview" description="Governing details, NAAC accreditation cycle status, and accreditation certificates." />

      {error && (
        <div
          style={{
            padding: "12px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            borderRadius: "8px",
            marginBottom: "15px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div className="panel">
        {loading ? (
          <div style={{ padding: "24px", color: "#64748b", fontSize: "13px" }}>
            Loading institution...
          </div>
        ) : !institution ? (
          <div style={{ padding: "24px", color: "#64748b", fontSize: "13px" }}>
            No institution is assigned to this account.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ width: "60px", height: "60px", background: "#2563eb", borderRadius: "14px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "800" }}>
                {(institution.name || "I").charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>{institution.name}</h2>
                <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
                  <span>Code: <strong>{institution.code || "-"}</strong></span>
                  <span>Location: <strong>{institution.city || "-"}, {institution.state || "-"}</strong></span>
                  <span>Type: <strong>{institution.institution_type || "-"}</strong></span>
                  <span>NAAC category: <strong>{institution.official_category || "-"}</strong></span>
                </div>
              </div>
            </div>

            <div className="standing-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div>
                <span>Established</span>
                <strong>{institution.established_year || "-"}</strong>
              </div>
              <div>
                <span>Website</span>
                <strong>{institution.website || "-"}</strong>
              </div>
              <div>
                <span>Address</span>
                <strong>{institution.address || "-"}</strong>
              </div>
            </div>
            <div className="standing-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: "12px" }}>
              <div>
                <span>Affiliated university</span>
                <strong>{institution.affiliated_university || institution.parent_institution_name || "-"}</strong>
              </div>
              <div>
                <span>Programme level</span>
                <strong>{institution.programme_level || "-"}</strong>
              </div>
              <div>
                <span>Confirmed framework</span>
                <strong>
                  {institution.confirmed_framework_name
                    ? `${institution.confirmed_framework_name} (${institution.confirmed_framework_version})`
                    : "Not confirmed"}
                </strong>
              </div>
            </div>
            {institution.confirmed_framework_name ? (
              <p style={{ fontSize: "12px", color: "#9a3412", marginTop: "12px" }}>
                Criterion structure:{" "}
                {institution.criterion_structure_verified
                  ? "seven-criteria RAF family (from the published manual)"
                  : "not verified as an official production pathway"}
                . {frameworkReadinessText(institution)}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default Institution;
