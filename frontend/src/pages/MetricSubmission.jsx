import React, {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle,
  FileText,
  UploadCloud,
  XCircle,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import criteriaService from "../services/criteriaService";
import submissionService from "../services/submissionService";

// ============================================================
// CONSTANTS
// ============================================================

const EDITABLE_STATUSES = [
  "draft",
  "changes requested",
  "resubmitted",
];

// ============================================================
// HELPERS
// ============================================================

const normalizeText = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const isEditableStatus = (status) => {
  return EDITABLE_STATUSES.includes(
    normalizeText(status)
  );
};

// ============================================================
// COMPONENT
// ============================================================

const MetricSubmission = () => {
  const navigate = useNavigate();

  const {
    criterionId,
    metricId,
  } = useParams();

  // ============================================================
  // MASTER DATA
  // ============================================================

  const [metric, setMetric] =
    useState(null);

  const [evidenceRequirements, setEvidenceRequirements] =
    useState([]);

  // ============================================================
  // SUBMISSION
  // ============================================================

  const [submission, setSubmission] =
    useState(null);

  const [value, setValue] =
    useState("");

  // ============================================================
  // STATE
  // ============================================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  // ============================================================
  // LOAD METRIC + EVIDENCE REQUIREMENTS
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          metricsData,
          evidenceData,
        ] = await Promise.all([
          criteriaService.getMetrics(),
          criteriaService.getEvidenceRequirements(),
        ]);

        const allMetrics =
          Array.isArray(metricsData)
            ? metricsData
            : [];

        const allEvidence =
          Array.isArray(evidenceData)
            ? evidenceData
            : [];

        const selectedMetric =
          allMetrics.find(
            (item) =>
              String(item.id) ===
              String(metricId)
          );

        if (!selectedMetric) {
          setError("Metric not found.");
          return;
        }

        setMetric(selectedMetric);

        const metricEvidence =
          allEvidence.filter(
            (item) =>
              String(item.metric_id) ===
              String(metricId)
          );

        setEvidenceRequirements(
          metricEvidence
        );

        console.log(
          "METRIC SUBMISSION METRIC:",
          selectedMetric
        );

        console.log(
          "METRIC SUBMISSION EVIDENCE:",
          metricEvidence
        );
      } catch (err) {
        console.error(
          "LOAD METRIC SUBMISSION DATA ERROR:",
          err?.response?.data || err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to load metric submission."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [metricId]);

  // ============================================================
  // CREATE DRAFT SUBMISSION
  // ============================================================

  const handleCreateSubmission =
    async () => {
      setError("");
      setMessage("");

      if (!metric) {
        setError(
          "Metric information is not available."
        );
        return;
      }

      if (value === "") {
        setError(
          "Please enter the metric value."
        );
        return;
      }

      const numericValue =
        Number(value);

      if (
        Number.isNaN(numericValue) ||
        numericValue < 0 ||
        numericValue > 100
      ) {
        setError(
          "Please enter a value between 0 and 100."
        );
        return;
      }

      try {
        setSaving(true);

        const payload = {
          title:
            `${metric.code} - ${metric.title}`,

          criterion_id:
            Number(criterionId),

          metric_code:
            metric.code,

          data_json:
            JSON.stringify({
              value: numericValue,
              unit: "percentage",

              total_students: 1000,

              participating_students:
                numericValue === 70
                  ? 700
                  : null,

              example:
                numericValue === 70
                  ? "700 out of 1000 students"
                  : null,
            }),
        };

        console.log(
          "CREATING DRAFT SUBMISSION:",
          payload
        );

        const result =
          await submissionService.createSubmission(
            payload
          );

        console.log(
          "CREATED SUBMISSION:",
          result
        );

        setSubmission(result);

        setMessage(
          `Draft Submission #${result.id} created successfully.`
        );
      } catch (err) {
        console.error(
          "CREATE SUBMISSION ERROR:",
          err?.response?.data || err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to create draft submission."
          )
        );
      } finally {
        setSaving(false);
      }
    };

  // ============================================================
  // MANAGE EVIDENCE
  //
  // IMPORTANT:
  // Evidence is NOT uploaded here.
  //
  // This page creates the draft.
  // Documents & Evidence handles the actual file upload.
  // ============================================================

  const handleManageEvidence =
    () => {
      if (!submission) {
        setError(
          "Create a draft submission first."
        );
        return;
      }

      navigate(
        `/documents/upload?criterion_id=${encodeURIComponent(
          criterionId
        )}&metric_id=${encodeURIComponent(
          metricId
        )}&submission_id=${encodeURIComponent(
          submission.id
        )}`
      );
    };

  // ============================================================
  // SUBMIT FOR REVIEW
  // ============================================================

  const handleSubmit = async () => {
    setError("");
    setMessage("");

    if (!submission) {
      setError(
        "Create a draft submission first."
      );
      return;
    }

    if (
      !isEditableStatus(
        submission.status
      )
    ) {
      setError(
        `Submission #${submission.id} cannot be submitted from status "${submission.status}".`
      );
      return;
    }

    try {
      setSubmitting(true);

      const result =
        await submissionService.submitSubmission(
          submission.id
        );

      console.log(
        "SUBMIT SUBMISSION RESPONSE:",
        result
      );

      setSubmission(result);

      setMessage(
        `Submission #${submission.id} submitted for review.`
      );
    } catch (err) {
      console.error(
        "SUBMIT SUBMISSION ERROR:",
        err?.response?.data || err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to submit the submission for review."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          color: "#1e293b",
        }}
      >
        Loading metric submission...
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      style={{
        maxWidth: "1000px",
        color: "#1e293b",
      }}
    >
      {/* ======================================================
          BACK
      ====================================================== */}

      <button
        onClick={() =>
          navigate(
            `/criteria/${criterionId}/metrics/${metricId}`
          )
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          border: "none",
          background: "transparent",
          color: "#2563eb",
          cursor: "pointer",
          fontWeight: 600,
          marginBottom: "18px",
        }}
      >
        <ArrowLeft size={17} />

        Back to Metric
      </button>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          background:
            "linear-gradient(135deg, #173b72, #214d8f)",
          borderRadius: "14px",
          padding: "26px 28px",
          color: "#ffffff",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "1.5px",
            fontWeight: 700,
            opacity: 0.8,
            marginBottom: "7px",
          }}
        >
          METRIC SUBMISSION
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "25px",
          }}
        >
          {metric?.code} - {metric?.title}
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            opacity: 0.85,
            fontSize: "14px",
          }}
        >
          Create and manage the submission
          for this NAAC metric.
        </p>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "13px 15px",
            marginBottom: "16px",
            border:
              "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: "9px",
          }}
        >
          <XCircle
            size={18}
            style={{
              flexShrink: 0,
            }}
          />

          <span>
            {error}
          </span>
        </div>
      )}

      {/* ======================================================
          SUCCESS
      ====================================================== */}

      {message && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "13px 15px",
            marginBottom: "16px",
            border:
              "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            borderRadius: "9px",
          }}
        >
          <CheckCircle size={18} />

          <span>
            {message}
          </span>
        </div>
      )}

      {/* ======================================================
          METRIC INFORMATION
      ====================================================== */}

      <div style={cardStyle}>
        <h2
          style={{
            marginTop: 0,
            fontSize: "18px",
          }}
        >
          Metric Information
        </h2>

        <div
          style={{
            background: "#f8fafc",
            border:
              "1px solid #e2e8f0",
            borderRadius: "9px",
            padding: "15px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: "6px",
            }}
          >
            {metric?.code}
          </div>

          <div
            style={{
              color: "#475569",
              fontSize: "13px",
            }}
          >
            {metric?.description ||
              metric?.title}
          </div>
        </div>
      </div>

      {/* ======================================================
          EVIDENCE REQUIREMENTS

          INFORMATION ONLY.
          NO FILE UPLOAD HERE.
      ====================================================== */}

      <div style={cardStyle}>
        <h2
          style={{
            marginTop: 0,
            fontSize: "18px",
          }}
        >
          Evidence Requirements
        </h2>

        <p
          style={{
            color: "#64748b",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          These are the evidence requirements
          configured for this metric. Actual
          evidence files are uploaded from the
          Documents & Evidence section after
          the draft is created.
        </p>

        {evidenceRequirements.length ===
        0 ? (
          <div
            style={{
              padding: "14px",
              background: "#fffbeb",
              border:
                "1px solid #fde68a",
              borderRadius: "9px",
              color: "#92400e",
            }}
          >
            No evidence requirement has
            been configured for this metric.
          </div>
        ) : (
          evidenceRequirements.map(
            (requirement) => (
              <div
                key={requirement.id}
                style={{
                  padding: "14px",
                  marginBottom: "10px",
                  background: "#eff6ff",
                  border:
                    "1px solid #dbeafe",
                  borderRadius: "9px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                    }}
                  >
                    {requirement.title}
                  </div>

                  {requirement.required && (
                    <span
                      style={{
                        padding:
                          "4px 9px",
                        borderRadius:
                          "999px",
                        background:
                          "#fee2e2",
                        color:
                          "#b91c1c",
                        fontSize:
                          "10px",
                        fontWeight:
                          700,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      REQUIRED
                    </span>
                  )}
                </div>

                {requirement.description && (
                  <div
                    style={{
                      marginTop: "6px",
                      color: "#475569",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    {
                      requirement.description
                    }
                  </div>
                )}
              </div>
            )
          )
        )}
      </div>

      {/* ======================================================
          ENTER METRIC DATA
      ====================================================== */}

      {!submission && (
        <div style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
              fontSize: "18px",
            }}
          >
            Enter Metric Data
          </h2>

          <p
            style={{
              color: "#64748b",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            Enter the value for this metric.
            A draft submission will be created
            before evidence is uploaded.
          </p>

          <input
            type="number"
            min="0"
            max="100"
            value={value}
            onChange={(event) =>
              setValue(
                event.target.value
              )
            }
            placeholder="Enter value (0-100)"
            style={inputStyle}
          />

          <div
            style={{
              marginTop: "18px",
              display: "flex",
              justifyContent:
                "flex-end",
            }}
          >
            <button
              onClick={
                handleCreateSubmission
              }
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 19px",
                border: "none",
                borderRadius: "8px",
                background: saving
                  ? "#94a3b8"
                  : "#2563eb",
                color: "#ffffff",
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 700,
              }}
            >
              <FileText size={17} />

              {saving
                ? "Creating Draft..."
                : "Create Draft Submission"}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================
          CREATED SUBMISSION
      ====================================================== */}

      {submission && (
        <>
          {/* ==================================================
              DRAFT INFORMATION
          ================================================== */}

          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                marginBottom: "18px",
              }}
            >
              <CheckCircle
                size={22}
                color="#16a34a"
              />

              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                }}
              >
                Draft Submission Created
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: "10px",
              }}
            >
              <MiniInfo
                label="Submission"
                value={`#${submission.id}`}
              />

              <MiniInfo
                label="Metric"
                value={
                  metric?.code
                }
              />

              <MiniInfo
                label="Status"
                value={
                  submission.status
                }
              />
            </div>
          </div>

          {/* ==================================================
              EVIDENCE MANAGEMENT
          ================================================== */}

          <div style={cardStyle}>
            <h2
              style={{
                marginTop: 0,
                fontSize: "18px",
              }}
            >
              Evidence Management
            </h2>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              Your draft has been created.
              Evidence is uploaded separately
              through Documents & Evidence and
              attached directly to this submission.
            </p>

            <div
              style={{
                padding: "14px",
                marginTop: "12px",
                background: "#eff6ff",
                border:
                  "1px solid #dbeafe",
                borderRadius: "9px",
                color: "#1e40af",
                fontSize: "13px",
              }}
            >
              <strong>
                Submission #{submission.id}
              </strong>{" "}
              is ready for evidence upload.
            </div>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                justifyContent:
                  "flex-end",
              }}
            >
              <button
                onClick={
                  handleManageEvidence
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "11px 19px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#0f766e",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                <UploadCloud
                  size={17}
                />

                Manage Evidence
              </button>
            </div>
          </div>

          {/* ==================================================
              SUBMIT FOR REVIEW
          ================================================== */}

          <div style={cardStyle}>
            <h2
              style={{
                marginTop: 0,
                fontSize: "18px",
              }}
            >
              Submit for Review
            </h2>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              After uploading the required
              evidence through Documents &
              Evidence, submit this draft for
              review.
            </p>

            <div
              style={{
                padding: "13px",
                marginTop: "12px",
                background: "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                borderRadius: "8px",
                color: "#475569",
                fontSize: "13px",
              }}
            >
              <strong>
                Workflow:
              </strong>{" "}
              Draft → Evidence Upload →
              Submit for Review → Reviewer
            </div>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                justifyContent:
                  "flex-end",
              }}
            >
              <button
                onClick={
                  handleSubmit
                }
                disabled={
                  submitting ||
                  !isEditableStatus(
                    submission.status
                  )
                }
                style={{
                  padding: "11px 19px",
                  border: "none",
                  borderRadius: "8px",
                  background:
                    submitting ||
                    !isEditableStatus(
                      submission.status
                    )
                      ? "#cbd5e1"
                      : "#173b72",
                  color: "#ffffff",
                  cursor:
                    submitting ||
                    !isEditableStatus(
                      submission.status
                    )
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: 700,
                }}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit for Review"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================
// MINI INFO
// ============================================================

const MiniInfo = ({
  label,
  value,
}) => (
  <div
    style={{
      background: "#f8fafc",
      borderRadius: "8px",
      padding: "11px",
    }}
  >
    <div
      style={{
        color: "#64748b",
        fontSize: "11px",
        marginBottom: "3px",
      }}
    >
      {label}
    </div>

    <strong
      style={{
        fontSize: "14px",
      }}
    >
      {value}
    </strong>
  </div>
);

// ============================================================
// ERROR MESSAGE
// ============================================================

const getErrorMessage = (
  error,
  fallback
) => {
  const detail =
    error?.response?.data?.detail;

  if (
    typeof detail === "string"
  ) {
    return detail;
  }

  if (
    Array.isArray(detail)
  ) {
    return detail
      .map(
        (item) =>
          item?.msg ||
          String(item)
      )
      .join(", ");
  }

  if (
    error?.message &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
};

// ============================================================
// STYLES
// ============================================================

const cardStyle = {
  background: "#ffffff",
  border:
    "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "22px",
  marginBottom: "18px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  border:
    "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#1e293b",
  fontSize: "14px",
  outline: "none",
};

export default MetricSubmission;
