import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { submissionService } from "../../services/submissionService";
import documentService from "../../services/documentService";

const EvidenceReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [startingReview, setStartingReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");

  const [previewDocument, setPreviewDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  /*
   * ---------------------------------------------------------
   * LOAD SUBMISSION
   * ---------------------------------------------------------
   */

  const loadSubmission = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await submissionService.getSubmission(id);

      setSubmission(data);
    } catch (err) {
      console.error(
        "Failed to load submission:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to load the submission."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD DOCUMENTS
   * ---------------------------------------------------------
   */

  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true);

      const data =
        await documentService.getDocuments();

      const allDocuments = Array.isArray(data)
        ? data
        : [];

      const filteredDocuments =
        allDocuments.filter(
          (document) =>
            String(document.submission_id) ===
            String(id)
        );

      setDocuments(filteredDocuments);
    } catch (err) {
      console.error(
        "Failed to load documents:",
        err
      );

      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!id) return;

    loadSubmission();
    loadDocuments();
  }, [id]);

  /*
   * ---------------------------------------------------------
   * START REVIEW
   * ---------------------------------------------------------
   */

  const handleStartReview = async () => {
    try {
      setStartingReview(true);
      setActionError("");

      const response =
        await submissionService.startReview(id);

      const updatedSubmission =
        response?.submission || response;

      setSubmission(updatedSubmission);

      alert("Review started successfully.");
    } catch (err) {
      console.error(
        "Failed to start review:",
        err
      );

      setActionError(
        err?.response?.data?.detail ||
          "Unable to start the review."
      );
    } finally {
      setStartingReview(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * SUBMIT REVIEW
   * ---------------------------------------------------------
   */

  const handleReviewDecision = async (status) => {
    if (submittingReview) return;

    if (!comments.trim()) {
      setActionError(
        "Please enter comments before submitting the review."
      );
      return;
    }

    let numericScore = null;

    if (score !== "") {
      numericScore = Number(score);

      if (Number.isNaN(numericScore)) {
        setActionError(
          "Please enter a valid score."
        );
        return;
      }

      if (numericScore < 0) {
        setActionError(
          "Score cannot be negative."
        );
        return;
      }
    }

    try {
      setSubmittingReview(true);
      setActionError("");

      const response =
        await submissionService.reviewSubmission(
          id,
          {
            status,
            comments: comments.trim(),
            score: numericScore,
          }
        );

      const updatedSubmission =
        response?.submission || response;

      setSubmission(updatedSubmission);

      if (status === "Approved") {
        alert(
          "Submission approved successfully."
        );
      } else if (
        status === "Changes Requested"
      ) {
        alert(
          "Changes requested successfully."
        );
      } else if (status === "Rejected") {
        alert(
          "Submission rejected successfully."
        );
      }

      navigate("/reviewer/queue");
    } catch (err) {
      console.error(
        "Failed to submit review:",
        err
      );

      setActionError(
        err?.response?.data?.detail ||
          "Unable to submit the review."
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * PREVIEW DOCUMENT
   * ---------------------------------------------------------
   */

  const handlePreview = async (document) => {
    try {
      setPreviewLoading(true);
      setActionError("");

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const blob =
        await documentService.previewDocument(
          document.id
        );

      const url = URL.createObjectURL(blob);

      setPreviewDocument(document);
      setPreviewUrl(url);
    } catch (err) {
      console.error(
        "Failed to preview document:",
        err
      );

      setActionError(
        "Unable to preview this document."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * DOWNLOAD DOCUMENT
   * ---------------------------------------------------------
   */

  const handleDownload = async (document) => {
    try {
      setActionError("");

      const response =
        await documentService.downloadDocument(
          document.id
        );

      const blob = response.data;

      const url = URL.createObjectURL(blob);

      const link =
        window.document.createElement("a");

      link.href = url;

      link.download =
        document.original_filename ||
        document.file_name ||
        document.filename ||
        `document-${document.id}`;

      window.document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(
        "Failed to download document:",
        err
      );

      setActionError(
        "Unable to download this document."
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * CLEAN PREVIEW URL
   * ---------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /*
   * ---------------------------------------------------------
   * FORMAT DATE
   * ---------------------------------------------------------
   */

  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
   * ---------------------------------------------------------
   * PARSE SUBMISSION DATA
   * ---------------------------------------------------------
   */

  const submissionData = useMemo(() => {
    if (!submission?.data_json) {
      return null;
    }

    try {
      return JSON.parse(submission.data_json);
    } catch {
      return submission.data_json;
    }
  }, [submission]);

  /*
   * ---------------------------------------------------------
   * STATUS HELPERS
   * ---------------------------------------------------------
   */

  const status = submission?.status;

  const canStartReview =
    status === "Submitted" ||
    status === "Resubmitted";

  const canSubmitDecision =
    status === "Under Review";

  const getStatusStyle = (currentStatus) => {
    switch (currentStatus) {
      case "Submitted":
      case "Resubmitted":
        return {
          background: "#fef3c7",
          color: "#92400e",
        };

      case "Under Review":
        return {
          background: "#dbeafe",
          color: "#1d4ed8",
        };

      case "Approved":
        return {
          background: "#dcfce7",
          color: "#166534",
        };

      case "Rejected":
        return {
          background: "#fee2e2",
          color: "#991b1b",
        };

      case "Changes Requested":
        return {
          background: "#ffedd5",
          color: "#9a3412",
        };

      case "Draft":
      default:
        return {
          background: "#e2e8f0",
          color: "#475569",
        };
    }
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Evidence Review</h1>

            <p>
              Loading submission...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR
   * ---------------------------------------------------------
   */

  if (error || !submission) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Evidence Review</h1>

            <p>
              {error ||
                "Submission not found."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/reviewer/queue")
            }
          >
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * MAIN PAGE
   * ---------------------------------------------------------
   */

  return (
    <div className="page-container">
      {/* HEADER */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1>Evidence Review</h1>

          <p>
            Evaluate the submission and supporting
            evidence.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/reviewer/queue")
          }
          style={{
            padding: "9px 16px",
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#334155",
            borderRadius: "7px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          ← Back to Queue
        </button>
      </div>

      {/* SUBMISSION SUMMARY */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "22px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: "0 0 8px",
                color: "#1e293b",
              }}
            >
              {submission.title ||
                "Untitled Submission"}
            </h2>

            <div
              style={{
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Submission ID: #{submission.id}
            </div>
          </div>

          <span
            style={{
              ...getStatusStyle(status),
              padding: "7px 13px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            {status || "Unknown"}
          </span>
        </div>

        {/* DETAILS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            marginTop: "22px",
            paddingTop: "18px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "4px",
              }}
            >
              Criterion
            </div>

            <strong>
              {submission.criterion_id
                ? `Criterion ${submission.criterion_id}`
                : "-"}
            </strong>
          </div>

          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "4px",
              }}
            >
              Metric
            </div>

            <strong>
              {submission.metric_code || "-"}
            </strong>
          </div>

          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "4px",
              }}
            >
              Department
            </div>

            <strong>
              {submission.department_id || "-"}
            </strong>
          </div>

          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "4px",
              }}
            >
              Created
            </div>

            <strong>
              {formatDate(
                submission.created_at
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* ACTION ERROR */}
      {actionError && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "12px 15px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {actionError}
        </div>
      )}

      {/* DRAFT WARNING */}
      {status === "Draft" && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fde68a",
            color: "#92400e",
            padding: "14px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <strong>
            This submission is still in Draft.
          </strong>

          <div style={{ marginTop: "4px" }}>
            The submission must be submitted before
            a Reviewer can start the review.
          </div>
        </div>
      )}

      {/* START REVIEW */}
      {canStartReview && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "18px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3
              style={{
                margin: "0 0 5px",
                color: "#1e3a8a",
              }}
            >
              Ready for Review
            </h3>

            <p
              style={{
                margin: 0,
                color: "#475569",
                fontSize: "14px",
              }}
            >
              Start the review to evaluate this
              submission and its supporting evidence.
            </p>
          </div>

          <button
            type="button"
            disabled={startingReview}
            onClick={handleStartReview}
            style={{
              padding: "10px 20px",
              background: startingReview
                ? "#94a3b8"
                : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              cursor: startingReview
                ? "not-allowed"
                : "pointer",
              fontWeight: "700",
            }}
          >
            {startingReview
              ? "Starting..."
              : "Start Review"}
          </button>
        </div>
      )}

      {/* SUBMISSION DATA */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "22px",
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#1e293b",
          }}
        >
          Submission Data
        </h2>

        {submissionData ? (
          <pre
            style={{
              background: "#0f172a",
              color: "#e2e8f0",
              padding: "16px",
              borderRadius: "8px",
              overflowX: "auto",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            {typeof submissionData === "string"
              ? submissionData
              : JSON.stringify(
                  submissionData,
                  null,
                  2
                )}
          </pre>
        ) : (
          <p
            style={{
              color: "#64748b",
            }}
          >
            No submission data available.
          </p>
        )}
      </div>

      {/* SUPPORTING EVIDENCE */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "22px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "#1e293b",
              }}
            >
              Supporting Evidence
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              {documentsLoading
                ? "Loading documents..."
                : `${documents.length} document${
                    documents.length !== 1
                      ? "s"
                      : ""
                  }`}
            </p>
          </div>
        </div>

        {documentsLoading ? (
          <p>Loading evidence...</p>
        ) : documents.length === 0 ? (
          <div
            style={{
              padding: "25px",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "8px",
              color: "#64748b",
            }}
          >
            No supporting evidence uploaded.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {documents.map((document) => (
              <div
                key={document.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "14px",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong
                    style={{
                      color: "#1e293b",
                    }}
                  >
                    {document.title ||
                      document.original_filename ||
                      document.file_name ||
                      document.filename ||
                      `Document #${document.id}`}
                  </strong>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "5px",
                    }}
                  >
                    {document.mime_type ||
                      document.content_type ||
                      "File"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handlePreview(document)
                    }
                    style={{
                      padding: "7px 13px",
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Preview
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(document)
                    }
                    style={{
                      padding: "7px 13px",
                      background: "#fff",
                      color: "#334155",
                      border:
                        "1px solid #cbd5e1",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DOCUMENT PREVIEW */}
      {previewDocument && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "22px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#1e293b",
              }}
            >
              Evidence Preview
            </h2>

            <button
              type="button"
              onClick={() => {
                if (previewUrl) {
                  URL.revokeObjectURL(
                    previewUrl
                  );
                }

                setPreviewUrl("");
                setPreviewDocument(null);
              }}
              style={{
                padding: "6px 12px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          {previewLoading ? (
            <p>Loading preview...</p>
          ) : previewUrl ? (
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "8px",
                padding: "10px",
              }}
            >
              {(
                previewDocument.mime_type ||
                previewDocument.content_type ||
                ""
              ).startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={
                    previewDocument.title ||
                    "Evidence preview"
                  }
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "700px",
                    margin: "0 auto",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title="Evidence Preview"
                  style={{
                    width: "100%",
                    height: "700px",
                    border: "none",
                    borderRadius: "6px",
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* REVIEW FORM */}
      {canSubmitDecision && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "22px",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#1e293b",
            }}
          >
            Review Decision
          </h2>

          <p
            style={{
              color: "#64748b",
              fontSize: "14px",
              marginBottom: "20px",
            }}
          >
            Evaluate the evidence and provide your
            score and comments before submitting a
            decision.
          </p>

          {/* SCORE */}
          <div
            style={{
              marginBottom: "18px",
            }}
          >
            <label
              htmlFor="review-score"
              style={{
                display: "block",
                fontWeight: "600",
                color: "#334155",
                marginBottom: "7px",
              }}
            >
              Score
            </label>

            <input
              id="review-score"
              type="number"
              min="0"
              step="0.01"
              value={score}
              onChange={(e) =>
                setScore(e.target.value)
              }
              placeholder="Enter score"
              style={{
                width: "100%",
                maxWidth: "250px",
                padding: "10px 12px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "7px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* COMMENTS */}
          <div
            style={{
              marginBottom: "22px",
            }}
          >
            <label
              htmlFor="review-comments"
              style={{
                display: "block",
                fontWeight: "600",
                color: "#334155",
                marginBottom: "7px",
              }}
            >
              Reviewer Comments
            </label>

            <textarea
              id="review-comments"
              value={comments}
              onChange={(e) =>
                setComments(e.target.value)
              }
              placeholder="Enter your evaluation comments..."
              rows={6}
              style={{
                width: "100%",
                padding: "11px 12px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "7px",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* DECISION BUTTONS */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {/* APPROVE */}
            <button
              type="button"
              disabled={submittingReview}
              onClick={() =>
                handleReviewDecision(
                  "Approved"
                )
              }
              style={{
                padding: "10px 20px",
                background: submittingReview
                  ? "#94a3b8"
                  : "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "7px",
                cursor: submittingReview
                  ? "not-allowed"
                  : "pointer",
                fontWeight: "700",
              }}
            >
              {submittingReview
                ? "Submitting..."
                : "✓ Approve"}
            </button>

            {/* CHANGES REQUESTED */}
            <button
              type="button"
              disabled={submittingReview}
              onClick={() =>
                handleReviewDecision(
                  "Changes Requested"
                )
              }
              style={{
                padding: "10px 20px",
                background: submittingReview
                  ? "#94a3b8"
                  : "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: "7px",
                cursor: submittingReview
                  ? "not-allowed"
                  : "pointer",
                fontWeight: "700",
              }}
            >
              {submittingReview
                ? "Submitting..."
                : "↻ Changes Requested"}
            </button>

            {/* REJECT */}
            <button
              type="button"
              disabled={submittingReview}
              onClick={() =>
                handleReviewDecision(
                  "Rejected"
                )
              }
              style={{
                padding: "10px 20px",
                background: submittingReview
                  ? "#94a3b8"
                  : "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "7px",
                cursor: submittingReview
                  ? "not-allowed"
                  : "pointer",
                fontWeight: "700",
              }}
            >
              {submittingReview
                ? "Submitting..."
                : "✕ Reject"}
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED REVIEW MESSAGE */}
      {!canStartReview &&
        !canSubmitDecision &&
        status !== "Draft" && (
          <div
            style={{
              background: "#f8fafc",
              border:
                "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "18px",
              marginBottom: "20px",
            }}
          >
            <strong>
              Review status: {status}
            </strong>

            {submission.change_request_reason && (
              <p
                style={{
                  marginBottom: 0,
                  color: "#64748b",
                }}
              >
                Change request:{" "}
                {
                  submission.change_request_reason
                }
              </p>
            )}

            {submission.rejection_reason && (
              <p
                style={{
                  marginBottom: 0,
                  color: "#64748b",
                }}
              >
                Rejection reason:{" "}
                {submission.rejection_reason}
              </p>
            )}
          </div>
        )}
    </div>
  );
};

export default EvidenceReview;