import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import criteriaService from "../services/criteriaService";
import submissionService from "../services/submissionService";
import documentService from "../services/documentService";

const MetricSubmission = () => {
  const { criterionId, metricId } = useParams();
  const navigate = useNavigate();

  const [metric, setMetric] = useState(null);
  const [evidenceRequirements, setEvidenceRequirements] = useState([]);

  const [value, setValue] = useState("");
  const [file, setFile] = useState(null);

  const [submission, setSubmission] = useState(null);
  const [uploadedEvidence, setUploadedEvidence] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ============================================================
  // LOAD METRIC + EVIDENCE REQUIREMENTS
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const metrics = await criteriaService.getMetrics();

        const selectedMetric = Array.isArray(metrics)
          ? metrics.find(
              (item) =>
                String(item.id) === String(metricId)
            )
          : null;

        if (!selectedMetric) {
          setError("Metric not found.");
          return;
        }

        setMetric(selectedMetric);

        const allEvidence =
          await criteriaService.getEvidenceRequirements();

        const metricEvidence = Array.isArray(allEvidence)
          ? allEvidence.filter(
              (item) =>
                String(item.metric_id) ===
                String(metricId)
            )
          : [];

        setEvidenceRequirements(metricEvidence);

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
          "LOAD METRIC SUBMISSION ERROR:",
          err
        );

        setError(
          err?.response?.data?.detail ||
            "Unable to load metric submission."
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

  const handleCreateSubmission = async () => {
    if (!value.trim()) {
      setError("Please enter the metric value.");
      return;
    }

    const numericValue = Number(value);

    if (
      Number.isNaN(numericValue) ||
      numericValue < 0 ||
      numericValue > 100
    ) {
      setError(
        "Please enter a percentage value between 0 and 100."
      );
      return;
    }

    if (!metric) {
      setError("Metric information is missing.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        title: `${metric.code} - ${metric.title}`,

        criterion_id: Number(criterionId),

        metric_code: metric.code,

        data_json: JSON.stringify({
          value: numericValue,
          unit: "percentage",

          // Demo calculation
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
        "CREATE METRIC SUBMISSION PAYLOAD:",
        payload
      );

      const created =
        await submissionService.createSubmission(
          payload
        );

      setSubmission(created);

      setMessage(
        `Draft submission #${created.id} created successfully.`
      );
    } catch (err) {
      console.error(
        "CREATE METRIC SUBMISSION ERROR:",
        err?.response?.data || err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to create submission."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // UPLOAD EVIDENCE
  // ============================================================

  const handleUpload = async () => {
    if (!submission) {
      setError(
        "Create the draft submission before uploading evidence."
      );
      return;
    }

    if (!file) {
      setError("Please select an evidence file.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");

      const result =
        await documentService.uploadEvidence(
          file,
          submission.id,
          `${metric.code} - ${file.name}`
        );

      setUploadedEvidence(result);

      setMessage(
        `Evidence uploaded successfully: ${result.title}`
      );
    } catch (err) {
      console.error(
        "EVIDENCE UPLOAD ERROR:",
        err?.response?.data || err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to upload evidence."
      );
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    if (!submission) {
      setError(
        "Create the draft submission first."
      );
      return;
    }

    const primaryEvidence =
      evidenceRequirements[0];

    if (
      primaryEvidence?.required &&
      !uploadedEvidence
    ) {
      setError(
        "Please upload the required evidence before submitting."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await submissionService.submitSubmission(
        submission.id
      );

      setSubmission((previous) => ({
        ...previous,
        status: "Submitted",
      }));

      setMessage(
        "Submission sent successfully for review."
      );
    } catch (err) {
      console.error(
        "SUBMIT METRIC ERROR:",
        err?.response?.data || err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to submit the submission."
      );
    } finally {
      setSaving(false);
    }
  };

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
  // ERROR WITHOUT METRIC
  // ============================================================

  if (error && !metric) {
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
              `/criteria/${criterionId}/metrics/${metricId}`
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
          ← Back to Metric
        </button>

        <h2>{error}</h2>
      </div>
    );
  }

  const primaryEvidence =
    evidenceRequirements[0];

  const canSubmit =
    Boolean(submission) &&
    submission?.status === "Draft" &&
    !saving &&
    (
      !primaryEvidence?.required ||
      Boolean(uploadedEvidence)
    );

  return (
    <div
      style={{
        color: "#1e293b",
        maxWidth: "900px",
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
          border: "none",
          background: "transparent",
          color: "#2563eb",
          cursor: "pointer",
          fontWeight: 600,
          marginBottom: "20px",
        }}
      >
        ← Back to Metric
      </button>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          marginBottom: "24px",
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

        <h1
          style={{
            margin: "14px 0 8px",
          }}
        >
          Create NAAC Submission
        </h1>

        <p
          style={{
            color: "#64748b",
            margin: 0,
          }}
        >
          {metric.title}
        </p>
      </div>

      {/* ======================================================
          MESSAGES
      ====================================================== */}

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "8px",
            background: "#f0fdf4",
            color: "#166534",
          }}
        >
          {message}
        </div>
      )}

      {/* ======================================================
          1. ENTER METRIC DATA
      ====================================================== */}

      <div
        className="panel"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          1. Enter Metric Data
        </h2>

        <label
          style={{
            display: "block",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          Percentage Value
        </label>

        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value}
          onChange={(event) =>
            setValue(event.target.value)
          }
          placeholder="Enter percentage, e.g. 70"
          disabled={Boolean(submission)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            fontSize: "15px",
          }}
        />

        <p
          style={{
            marginTop: "8px",
            color: "#64748b",
            fontSize: "13px",
          }}
        >
          Demo example:
          700 out of 1000 students = 70%.
        </p>

        {!submission && (
          <button
            onClick={
              handleCreateSubmission
            }
            disabled={saving}
            style={{
              marginTop: "14px",
              padding: "11px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              fontWeight: 600,
            }}
          >
            {saving
              ? "Creating..."
              : "Create Draft Submission"}
          </button>
        )}

        {submission && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#f8fafc",
              borderRadius: "8px",
              color: "#475569",
              fontSize: "14px",
            }}
          >
            Draft Submission ID:
            <strong>
              {" "}
              #{submission.id}
            </strong>
          </div>
        )}
      </div>

      {/* ======================================================
          2. UPLOAD EVIDENCE
      ====================================================== */}

      <div
        className="panel"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          2. Upload Evidence
        </h2>

        {primaryEvidence ? (
          <>
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "8px",
                padding: "14px",
                marginBottom: "16px",
              }}
            >
              <strong>
                {primaryEvidence.title}
              </strong>

              {primaryEvidence.description && (
                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  {
                    primaryEvidence.description
                  }
                </p>
              )}

              <div
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  marginTop: "8px",
                }}
              >
                Allowed:
                {" "}
                {primaryEvidence.allowed_file_types ||
                  "Not specified"}
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  marginTop: "4px",
                }}
              >
                Maximum files:
                {" "}
                {primaryEvidence.max_files ||
                  5}
              </div>
            </div>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              disabled={
                !submission ||
                uploading ||
                submission.status !==
                  "Draft"
              }
              onChange={(event) =>
                setFile(
                  event.target.files?.[0] ||
                    null
                )
              }
            />

            {file && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderRadius: "7px",
                  fontSize: "13px",
                  color: "#475569",
                }}
              >
                Selected:
                {" "}
                <strong>
                  {file.name}
                </strong>
              </div>
            )}

            <div
              style={{
                marginTop: "14px",
              }}
            >
              <button
                onClick={handleUpload}
                disabled={
                  !submission ||
                  !file ||
                  uploading ||
                  submission.status !==
                    "Draft"
                }
                style={{
                  padding:
                    "10px 16px",
                  border: "none",
                  borderRadius: "8px",
                  background:
                    !submission ||
                    !file ||
                    uploading
                      ? "#cbd5e1"
                      : "#0f766e",
                  color: "#ffffff",
                  cursor:
                    !submission ||
                    !file ||
                    uploading
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: 600,
                }}
              >
                {uploading
                  ? "Uploading..."
                  : "Upload Evidence"}
              </button>
            </div>

            {uploadedEvidence && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "#f0fdf4",
                  border:
                    "1px solid #bbf7d0",
                  borderRadius: "8px",
                  color: "#166534",
                }}
              >
                ✓ Evidence uploaded:
                {" "}
                <strong>
                  {uploadedEvidence.title}
                </strong>
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#64748b",
              border:
                "1px dashed #cbd5e1",
              borderRadius: "8px",
            }}
          >
            No evidence requirement configured
            for this metric.
          </div>
        )}
      </div>

      {/* ======================================================
          3. SUBMIT
      ====================================================== */}

      <div
        className="panel"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          3. Submit
        </h2>

        <div
          style={{
            marginBottom: "14px",
            color: "#64748b",
          }}
        >
          Current status:
          {" "}
          <strong
            style={{
              color: "#1e293b",
            }}
          >
            {submission?.status ||
              "Not Created"}
          </strong>
        </div>

        {primaryEvidence?.required &&
          !uploadedEvidence &&
          submission && (
            <p
              style={{
                color: "#b45309",
                fontSize: "13px",
                marginBottom: "14px",
              }}
            >
              Required evidence must be uploaded
              before submission.
            </p>
          )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            padding: "11px 20px",
            border: "none",
            borderRadius: "8px",
            background: canSubmit
              ? "#2563eb"
              : "#cbd5e1",
            color: "#ffffff",
            cursor: canSubmit
              ? "pointer"
              : "not-allowed",
            fontWeight: 600,
          }}
        >
          {saving
            ? "Submitting..."
            : "Submit for Review"}
        </button>

        {submission?.status ===
          "Submitted" && (
          <button
            onClick={() =>
              navigate(
                "/submissions"
              )
            }
            style={{
              marginLeft: "10px",
              padding: "11px 20px",
              border:
                "1px solid #cbd5e1",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Go to Submissions
          </button>
        )}
      </div>
    </div>
  );
};

export default MetricSubmission;