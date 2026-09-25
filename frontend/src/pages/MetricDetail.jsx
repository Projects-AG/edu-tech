import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import criteriaService from "../services/criteriaService";

const MetricDetail = () => {
  const { criterionId, metricId } = useParams();
  const navigate = useNavigate();

  const [metric, setMetric] = useState(null);
  const [evidenceRequirements, setEvidenceRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD METRIC + EVIDENCE REQUIREMENTS
  // ============================================================

  useEffect(() => {
    const loadMetricData = async () => {
      try {
        setLoading(true);
        setError("");

        // ------------------------------------------------------
        // 1. Get all metrics
        // ------------------------------------------------------

        const metrics =
          await criteriaService.getMetrics();

        // ------------------------------------------------------
        // 2. Find selected metric
        // ------------------------------------------------------

        const selectedMetric = Array.isArray(metrics)
          ? metrics.find(
              (m) =>
                String(m.id) ===
                String(metricId)
            )
          : null;

        if (!selectedMetric) {
          setError("Metric not found.");
          return;
        }

        setMetric(selectedMetric);

        // ------------------------------------------------------
        // 3. Get all evidence requirements
        // ------------------------------------------------------

        const allEvidence =
          await criteriaService.getEvidenceRequirements();

        // ------------------------------------------------------
        // 4. Keep only evidence for this metric
        // ------------------------------------------------------

        const metricEvidence =
          Array.isArray(allEvidence)
            ? allEvidence.filter(
                (evidence) =>
                  String(
                    evidence.metric_id
                  ) === String(metricId)
              )
            : [];

        setEvidenceRequirements(
          metricEvidence
        );

        console.log(
          "SELECTED METRIC:",
          selectedMetric
        );

        console.log(
          "EVIDENCE REQUIREMENTS:",
          metricEvidence
        );
      } catch (err) {
        console.error(
          "Failed to load metric:",
          err
        );

        setError(
          "Failed to load metric data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMetricData();
  }, [metricId]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div
        style={{
          padding: "30px",
          color: "#1e293b",
        }}
      >
        Loading metric...
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div
        style={{
          padding: "30px",
          color: "#1e293b",
        }}
      >
        <button
          onClick={() =>
            navigate(
              `/criteria/${criterionId}`
            )
          }
          style={{
            border: "none",
            background: "transparent",
            color: "#2563eb",
            cursor: "pointer",
            fontWeight: 600,
            marginBottom: "20px",
          }}
        >
          ← Back to Criterion
        </button>

        <h2>{error}</h2>
      </div>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div
      style={{
        color: "#1e293b",
      }}
    >
      {/* ======================================================
          BACK
      ====================================================== */}

      <button
        onClick={() =>
          navigate(
            `/criteria/${criterionId}`
          )
        }
        style={{
          border: "none",
          background: "transparent",
          color: "#2563eb",
          cursor: "pointer",
          fontWeight: 600,
          marginBottom: "20px",
        }}
      >
        ← Back to Criterion
      </button>

      {/* ======================================================
          METRIC HEADER
      ====================================================== */}

      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "10px",
          }}
        >
          <span
            style={{
              background: "#eff6ff",
              color: "#2563eb",
              padding: "7px 12px",
              borderRadius: "7px",
              fontWeight: 700,
            }}
          >
            {metric.code}
          </span>

          <span
            style={{
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Metric Detail
          </span>
        </div>

        <h1
          style={{
            margin: 0,
          }}
        >
          {metric.title}
        </h1>

        {metric.description && (
          <p
            style={{
              color: "#64748b",
              marginTop: "10px",
              lineHeight: 1.6,
            }}
          >
            {metric.description}
          </p>
        )}
      </div>

      {/* ======================================================
          METRIC INFORMATION
      ====================================================== */}

      <div
        className="panel"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "18px",
          }}
        >
          Metric Information
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          <InfoItem
            label="Metric Code"
            value={metric.code}
          />

          <InfoItem
            label="Metric Type"
            value={
              metric.metric_type
            }
          />

          <InfoItem
            label="Weightage"
            value={
              metric.weightage
            }
          />

          <InfoItem
            label="Maximum Score"
            value={
              metric.max_score
            }
          />

          <InfoItem
            label="Evidence Required"
            value={
              metric.requires_evidence
                ? "Yes"
                : "No"
            }
          />

          <InfoItem
            label="Evidence Requirements"
            value={
              evidenceRequirements.length
            }
          />
        </div>
      </div>

      {/* ======================================================
          EVIDENCE REQUIREMENTS
      ====================================================== */}

      <div
        className="panel"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              Evidence Requirements
            </h2>

            <p
              style={{
                color: "#64748b",
                marginTop: "6px",
                marginBottom: 0,
              }}
            >
              Evidence required for this metric.
            </p>
          </div>

          <span
            style={{
              background: "#eff6ff",
              color: "#2563eb",
              padding: "7px 12px",
              borderRadius: "20px",
              fontWeight: 600,
            }}
          >
            {evidenceRequirements.length}{" "}
            Requirements
          </span>
        </div>

        {/* ----------------------------------------------------
            NO EVIDENCE
        ---------------------------------------------------- */}

        {evidenceRequirements.length === 0 && (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              color: "#64748b",
              border:
                "1px dashed #cbd5e1",
              borderRadius: "10px",
            }}
          >
            {metric.requires_evidence
              ? "No evidence requirements found."
              : "Evidence is not required for this metric."}
          </div>
        )}

        {/* ----------------------------------------------------
            EVIDENCE CARDS
        ---------------------------------------------------- */}

        {evidenceRequirements.map(
          (evidence) => (
            <div
              key={evidence.id}
              style={{
                border:
                  "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "18px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  gap: "20px",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                    }}
                  >
                    {evidence.title}
                  </h3>

                  {evidence.description && (
                    <p
                      style={{
                        color:
                          "#64748b",
                        marginTop:
                          "8px",
                        lineHeight:
                          1.5,
                        marginBottom: 0,
                      }}
                    >
                      {
                        evidence.description
                      }
                    </p>
                  )}
                </div>

                {evidence.required && (
                  <span
                    style={{
                      background:
                        "#fef2f2",
                      color:
                        "#dc2626",
                      padding:
                        "5px 10px",
                      borderRadius:
                        "15px",
                      fontSize:
                        "12px",
                      fontWeight:
                        700,
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    Required
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginTop: "14px",
                  fontSize: "13px",
                  color: "#64748b",
                }}
              >
                <span>
                  <strong>
                    Allowed formats:
                  </strong>{" "}
                  {formatFileTypes(
                    evidence.allowed_file_types
                  )}
                </span>

                <span>
                  <strong>
                    Maximum files:
                  </strong>{" "}
                  {evidence.max_files ??
                    "Not specified"}
                </span>
              </div>
            </div>
          )
        )}
      </div>

      {/* ======================================================
          START SUBMISSION
      ====================================================== */}

      <div
        className="panel"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "20px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                marginTop: 0,
                marginBottom: "8px",
              }}
            >
              Start Submission
            </h2>

            <p
              style={{
                color: "#64748b",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Enter the metric value, upload
              the required evidence, and submit
              it for review.
            </p>
          </div>

          <button
            onClick={() =>
              navigate(
                `/criteria/${criterionId}/metrics/${metricId}/submit`
              )
            }
            style={{
              padding:
                "11px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace:
                "nowrap",
            }}
          >
            Create Submission
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// INFO ITEM
// ============================================================

const InfoItem = ({
  label,
  value,
}) => (
  <div
    style={{
      background: "#f8fafc",
      borderRadius: "8px",
      padding: "14px",
    }}
  >
    <p
      style={{
        margin: 0,
        color: "#64748b",
        fontSize: "13px",
      }}
    >
      {label}
    </p>

    <strong
      style={{
        display: "block",
        marginTop: "5px",
        fontSize: "16px",
      }}
    >
      {value ?? "-"}
    </strong>
  </div>
);

// ============================================================
// FORMAT FILE TYPES
// ============================================================

const formatFileTypes = (
  types
) => {
  if (!types) {
    return "Not specified";
  }

  if (Array.isArray(types)) {
    return types.join(", ");
  }

  return String(types)
    .replaceAll(",", ", ")
    .toUpperCase();
};

export default MetricDetail;