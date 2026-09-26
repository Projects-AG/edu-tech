import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { submissionService } from "../../services/submissionService";
import documentService from "../../services/documentService";

const DataApproverReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  const [comments, setComments] = useState("");

  const [previewDocument, setPreviewDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // ============================================================
  // LOAD SUBMISSION
  // ============================================================

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

  // ============================================================
  // LOAD DOCUMENTS
  // ============================================================

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

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    if (!id) return;

    loadSubmission();
    loadDocuments();
  }, [id]);

  // ============================================================
  // APPROVE
  // ============================================================

  const handleApprove = async () => {
    if (actionLoading) return;

    try {
      setActionLoading(true);
      setActionError("");

      await submissionService.approveSubmission(
        id,
        {
          comments: comments.trim(),
        }
      );

      alert(
        "Submission approved successfully."
      );

      navigate("/review");
    } catch (err) {
      console.error(
        "Data approval failed:",
        err
      );

      setActionError(
        err?.response?.data?.detail ||
          "Unable to approve the submission."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // REJECT
  // ============================================================

  const handleReject = async () => {
    if (actionLoading) return;

    if (comments.trim().length < 3) {
      setActionError(
        "Please enter a rejection reason of at least 3 characters."
      );
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      await submissionService
        .rejectSubmissionByDataApprover(
          id,
          {
            reason: comments.trim(),
          }
        );

      alert(
        "Submission rejected successfully."
      );

      navigate("/review");
    } catch (err) {
      console.error(
        "Data rejection failed:",
        err
      );

      setActionError(
        err?.response?.data?.detail ||
          "Unable to reject the submission."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // PREVIEW DOCUMENT
  // ============================================================

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

      const url =
        URL.createObjectURL(blob);

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

  // ============================================================
  // DOWNLOAD DOCUMENT
  // ============================================================

  const handleDownload = async (document) => {
    try {
      setActionError("");

      const response =
        await documentService.downloadDocument(
          document.id
        );

      const blob = response.data;

      const url =
        URL.createObjectURL(blob);

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

  // ============================================================
  // CLEAN PREVIEW URL
  // ============================================================

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (
      Number.isNaN(parsedDate.getTime())
    ) {
      return "-";
    }

    return parsedDate.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // ============================================================
  // PARSE SUBMISSION DATA
  // ============================================================

  const submissionData = useMemo(() => {
    if (!submission?.data_json) {
      return null;
    }

    try {
      return JSON.parse(
        submission.data_json
      );
    } catch {
      return submission.data_json;
    }
  }, [submission]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div
        style={{
          padding: "30px",
        }}
      >
        Loading submission...
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error || !submission) {
    return (
      <div
        style={{
          padding: "30px",
        }}
      >
        <h2>
          Unable to load submission
        </h2>

        <p>
          {error ||
            "Submission not found."}
        </p>

        <button
          onClick={() =>
            navigate("/review")
          }
        >
          ← Back to Approval Queue
        </button>
      </div>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          marginBottom: "20px",
          gap: "20px",
        }}
      >
        <div>
          <div
            style={{
              color: "#2563eb",
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "1px",
            }}
          >
            DATA APPROVAL
          </div>

          <h1
            style={{
              margin:
                "6px 0 6px",
              color: "#0f172a",
            }}
          >
            Submission Review
          </h1>

          <p
            style={{
              margin: 0,
              color: "#64748b",
            }}
          >
            Review the complete submission
            and supporting evidence before
            making a data approval decision.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/review")
          }
          style={{
            padding: "9px 16px",
            border:
              "1px solid #cbd5e1",
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

      {/* =====================================================
          ACTION ERROR
      ===================================================== */}

      {actionError && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "12px 15px",
            borderRadius: "7px",
            marginBottom: "20px",
          }}
        >
          {actionError}
        </div>
      )}

      {/* =====================================================
          SUBMISSION SUMMARY
      ===================================================== */}

      <div
        style={{
          background: "#fff",
          border:
            "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "22px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin:
                  "0 0 8px",
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
              Submission ID: #
              {submission.id}
            </div>
          </div>

          <span
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding:
                "7px 13px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "700",
              height: "fit-content",
            }}
          >
            {submission.status}
          </span>
        </div>

        {/* DETAILS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          <Detail
            label="Criterion"
            value={
              submission.criterion_id
                ? `Criterion ${submission.criterion_id}`
                : "-"
            }
          />

          <Detail
            label="Metric"
            value={
              submission.metric_code ||
              "-"
            }
          />

          <Detail
            label="Department"
            value={
              submission.department_id
                ? `Department ${submission.department_id}`
                : "-"
            }
          />

          <Detail
            label="Submitted By"
            value={
              submission.user_id
                ? `User ${submission.user_id}`
                : "-"
            }
          />

          <Detail
            label="Reviewed By"
            value={
              submission.reviewed_by
                ? `User ${submission.reviewed_by}`
                : "-"
            }
          />

          <Detail
            label="Reviewed At"
            value={formatDate(
              submission.reviewed_at
            )}
          />
        </div>
      </div>

      {/* =====================================================
          SUBMISSION DATA
      ===================================================== */}

      <div
        style={{
          background: "#fff",
          border:
            "1px solid #e2e8f0",
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
            {typeof submissionData ===
            "string"
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

      {/* =====================================================
          SUPPORTING EVIDENCE
      ===================================================== */}

      <div
        style={{
          background: "#fff",
          border:
            "1px solid #e2e8f0",
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
          Supporting Evidence
        </h2>

        <p
          style={{
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          {documentsLoading
            ? "Loading documents..."
            : `${documents.length} document${
                documents.length !==
                1
                  ? "s"
                  : ""
              }`}
        </p>

        {documentsLoading ? (
          <p>
            Loading evidence...
          </p>
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
            No supporting evidence
            uploaded.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection:
                "column",
              gap: "10px",
            }}
          >
            {documents.map(
              (document) => (
                <div
                  key={document.id}
                  style={{
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "14px",
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        color:
                          "#1e293b",
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
                        fontSize:
                          "12px",
                        color:
                          "#64748b",
                        marginTop:
                          "5px",
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
                        handlePreview(
                          document
                        )
                      }
                      style={{
                        padding:
                          "7px 13px",
                        background:
                          "#2563eb",
                        color:
                          "#fff",
                        border:
                          "none",
                        borderRadius:
                          "6px",
                        cursor:
                          "pointer",
                      }}
                    >
                      Preview
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDownload(
                          document
                        )
                      }
                      style={{
                        padding:
                          "7px 13px",
                        background:
                          "#fff",
                        color:
                          "#334155",
                        border:
                          "1px solid #cbd5e1",
                        borderRadius:
                          "6px",
                        cursor:
                          "pointer",
                      }}
                    >
                      Download
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          DOCUMENT PREVIEW
      ===================================================== */}

      {previewDocument && (
        <div
          style={{
            background: "#fff",
            border:
              "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "22px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom:
                "15px",
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
                setPreviewDocument(
                  null
                );
              }}
              style={{
                padding:
                  "6px 12px",
                border:
                  "1px solid #cbd5e1",
                background:
                  "#fff",
                borderRadius:
                  "6px",
                cursor:
                  "pointer",
              }}
            >
              Close
            </button>
          </div>

          {previewLoading ? (
            <p>
              Loading preview...
            </p>
          ) : previewUrl ? (
            <div
              style={{
                background:
                  "#f8fafc",
                borderRadius:
                  "8px",
                padding: "10px",
              }}
            >
              {(
                previewDocument.mime_type ||
                previewDocument.content_type ||
                ""
              ).startsWith(
                "image/"
              ) ? (
                <img
                  src={previewUrl}
                  alt={
                    previewDocument.title ||
                    "Evidence preview"
                  }
                  style={{
                    display:
                      "block",
                    maxWidth:
                      "100%",
                    maxHeight:
                      "700px",
                    margin:
                      "0 auto",
                    objectFit:
                      "contain",
                  }}
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title="Evidence Preview"
                  style={{
                    width:
                      "100%",
                    height:
                      "700px",
                    border:
                      "none",
                    borderRadius:
                      "6px",
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* =====================================================
          DATA APPROVAL
      ===================================================== */}

      <div
        style={{
          background: "#fff",
          border:
            "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "22px",
          marginBottom: "30px",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#1e293b",
          }}
        >
          Data Approval Decision
        </h2>

        <p
          style={{
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          Review the submission and
          supporting evidence before
          approving or rejecting it.
        </p>

        <label
          htmlFor="approval-comments"
          style={{
            display: "block",
            fontWeight: "600",
            color: "#334155",
            marginBottom: "7px",
          }}
        >
          Comments / Rejection Reason
        </label>

        <textarea
          id="approval-comments"
          value={comments}
          onChange={(event) =>
            setComments(
              event.target.value
            )
          }
          placeholder="Enter comments. For rejection, provide the reason."
          rows={5}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            border:
              "1px solid #cbd5e1",
            borderRadius: "7px",
            resize: "vertical",
            fontSize: "14px",
            marginBottom:
              "16px",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={handleApprove}
            disabled={actionLoading}
            style={{
              padding:
                "10px 20px",
              background:
                actionLoading
                  ? "#94a3b8"
                  : "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              cursor:
                actionLoading
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "700",
            }}
          >
            {actionLoading
              ? "Processing..."
              : "✓ Approve"}
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={actionLoading}
            style={{
              padding:
                "10px 20px",
              background:
                actionLoading
                  ? "#94a3b8"
                  : "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              cursor:
                actionLoading
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "700",
            }}
          >
            {actionLoading
              ? "Processing..."
              : "✕ Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SMALL DETAIL COMPONENT
// ============================================================

const Detail = ({
  label,
  value,
}) => {
  return (
    <div
      style={{
        padding: "12px",
        background: "#f8fafc",
        borderRadius: "7px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#64748b",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: "600",
          color: "#1e293b",
        }}
      >
        {value}
      </div>
    </div>
  );
};

export default DataApproverReview;