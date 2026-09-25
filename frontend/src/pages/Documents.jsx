import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  RefreshCw,
  UploadCloud,
  Replace,
  Eye,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import documentService from "../services/documentService";
import DataTable from "../components/common/DataTable";
import PageHeader from "../components/common/PageHeader";

export const Documents = () => {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // REPLACE EVIDENCE STATE
  // ============================================================

  const [replacingId, setReplacingId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");

  const fileInputRef = useRef(null);

  const [selectedDocumentId, setSelectedDocumentId] =
    useState(null);

  // ============================================================
  // ALLOWED FILE TYPES
  // ============================================================

  const ALLOWED_EXTENSIONS = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "jpg",
    "jpeg",
    "png",
  ];

  // 10 MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  // ============================================================
  // LOAD EVIDENCE DOCUMENTS
  // ============================================================

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await documentService.getDocuments();

      console.log(
        "EVIDENCE DOCUMENTS:",
        data
      );

      if (Array.isArray(data)) {
        setDocuments(data);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error(
        "LOAD EVIDENCE ERROR:",
        err?.response?.data || err
      );

      setDocuments([]);

      setError(
        err?.response?.data?.detail ||
          "Unable to load evidence documents."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadDocuments();
  }, []);

  // ============================================================
  // OPEN UPLOAD SCREEN
  // ============================================================

  const handleUpload = () => {
    navigate("/documents/upload");
  };

  // ============================================================
  // OPEN REPLACE FILE PICKER
  // ============================================================

  const handleReplace = (documentId) => {
    setError("");
    setSuccessMessage("");
    setUploadProgress(0);

    setSelectedDocumentId(documentId);

    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  // ============================================================
  // HANDLE REPLACEMENT FILE
  // ============================================================

  const handleReplacementFile = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    // Reset input so the same file can be selected again
    event.target.value = "";

    if (!file || !selectedDocumentId) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setUploadProgress(0);

    // ----------------------------------------------------------
    // Validate extension
    // ----------------------------------------------------------

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (
      !extension ||
      !ALLOWED_EXTENSIONS.includes(
        extension
      )
    ) {
      setError(
        "Unsupported file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG and PNG."
      );

      setSelectedDocumentId(null);

      return;
    }

    // ----------------------------------------------------------
    // Validate size
    // ----------------------------------------------------------

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "File size must be 10 MB or less."
      );

      setSelectedDocumentId(null);

      return;
    }

    // ----------------------------------------------------------
    // Replace evidence
    // ----------------------------------------------------------

    try {
      setReplacingId(
        selectedDocumentId
      );

      const response =
        await documentService.replaceEvidence(
          selectedDocumentId,
          file,
          (progressEvent) => {
            if (!progressEvent.total) {
              return;
            }

            const progress =
              Math.round(
                (progressEvent.loaded /
                  progressEvent.total) *
                  100
              );

            setUploadProgress(progress);
          }
        );

      console.log(
        "REPLACE EVIDENCE RESPONSE:",
        response
      );

      setUploadProgress(100);

      setSuccessMessage(
        "Evidence replaced successfully. A new version has been created."
      );

      setSelectedDocumentId(null);

      // Refresh table
      await loadDocuments();
    } catch (err) {
      console.error(
        "REPLACE EVIDENCE ERROR:",
        err?.response?.data || err
      );

      const detail =
        err?.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item.msg)
            .join(", ")
        );
      } else {
        setError(
          detail ||
            "Unable to replace evidence."
        );
      }
    } finally {
      setReplacingId(null);
    }
  };

  // ============================================================
  // PREVIEW DOCUMENT
  // ============================================================

  const handlePreview = async (
    documentId
  ) => {
    try {
      setError("");
      setSuccessMessage("");

      const blob =
        await documentService.previewDocument(
          documentId
        );

      const url =
        URL.createObjectURL(blob);

      window.open(url, "_blank");

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
    } catch (err) {
      console.error(
        "PREVIEW DOCUMENT ERROR:",
        err?.response?.data || err
      );

      setError(
        "Unable to preview this evidence file."
      );
    }
  };

  // ============================================================
  // DOWNLOAD DOCUMENT
  // ============================================================

  const handleDownload = async (
    documentId,
    title,
    fileType
  ) => {
    try {
      setError("");
      setSuccessMessage("");

      const response =
        await documentService.downloadDocument(
          documentId
        );

      const blob = response.data;

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      // Try to preserve the original file name
      let fileName =
        title || "evidence-document";

      if (
        fileType &&
        !fileName
          .toLowerCase()
          .endsWith(
            `.${fileType.toLowerCase()}`
          )
      ) {
        fileName += `.${fileType.toLowerCase()}`;
      }

      link.download = fileName;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error(
        "DOWNLOAD DOCUMENT ERROR:",
        err?.response?.data || err
      );

      setError(
        "Unable to download this evidence file."
      );
    }
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    try {
      return new Date(
        value
      ).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return value;
    }
  };

  // ============================================================
  // FORMAT FILE SIZE
  // ============================================================

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "-";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };

  // ============================================================
  // FILE TYPE
  // ============================================================

  const getFileType = (doc) => {
    if (!doc?.file_type) {
      return "-";
    }

    return doc.file_type
      .replace("application/", "")
      .replace("image/", "")
      .replace("text/", "")
      .toUpperCase();
  };

  // ============================================================
  // SUBMISSION
  // ============================================================

  const getSubmission = (doc) => {
    if (!doc?.submission_id) {
      return "General Evidence";
    }

    return `Submission #${doc.submission_id}`;
  };

  // ============================================================
  // STATUS
  // ============================================================

  const getStatus = (doc) => {
    return (
      doc?.status ||
      "Uploaded"
    );
  };

  // ============================================================
  // TABLE COLUMNS
  // ============================================================

  const columns = [
    // ========================================================
    // EVIDENCE
    // ========================================================

    {
      title: "Evidence",
      dataIndex: "title",

      render: (value) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              background: "#eff6ff",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              flexShrink: 0,
            }}
          >
            <FileText
              size={17}
              color="#2563eb"
            />
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: "#1e293b",
                overflow: "hidden",
                textOverflow:
                  "ellipsis",
                whiteSpace:
                  "nowrap",
                maxWidth: "300px",
              }}
              title={
                value ||
                "Evidence Document"
              }
            >
              {value ||
                "Evidence Document"}
            </div>
          </div>
        </div>
      ),
    },

    // ========================================================
    // TYPE
    // ========================================================

    {
      title: "Type",
      dataIndex: "file_type",

      render: (_, row) => (
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#475569",
            background:
              "#f1f5f9",
            padding:
              "5px 8px",
            borderRadius:
              "6px",
          }}
        >
          {getFileType(row)}
        </span>
      ),
    },

    // ========================================================
    // SIZE
    // ========================================================

    {
      title: "Size",
      dataIndex: "file_size",

      render: (_, row) =>
        formatFileSize(
          row?.file_size
        ),
    },

    // ========================================================
    // SUBMISSION
    // ========================================================

    {
      title: "Submission",
      dataIndex:
        "submission_id",

      render: (_, row) =>
        getSubmission(row),
    },

    // ========================================================
    // UPLOADED BY
    // ========================================================

    {
      title: "Uploaded By",
      dataIndex:
        "uploaded_by",

      render: (_, row) =>
        row?.uploaded_by
          ? `User #${row.uploaded_by}`
          : "-",
    },

    // ========================================================
    // UPLOADED ON
    // ========================================================

    {
      title: "Uploaded On",
      dataIndex:
        "created_at",

      render: (_, row) =>
        formatDate(
          row?.created_at
        ),
    },

    // ========================================================
    // STATUS
    // ========================================================

    {
      title: "Status",
      dataIndex: "status",
      isStatus: true,

      render: (_, row) => {
        const status =
          getStatus(row);

        return (
          <span
            style={{
              display:
                "inline-block",
              padding:
                "5px 9px",
              borderRadius:
                "999px",

              background:
                status ===
                "Uploaded"
                  ? "#dcfce7"
                  : "#f1f5f9",

              color:
                status ===
                "Uploaded"
                  ? "#166534"
                  : "#475569",

              fontSize:
                "12px",
              fontWeight:
                600,
            }}
          >
            {status}
          </span>
        );
      },
    },

    // ========================================================
    // ACTIONS
    // ========================================================

    {
      title: "Action",
      dataIndex: "id",

      render: (_, row) => {
        const isReplacing =
          replacingId ===
          row?.id;

        const actionButtonStyle =
          {
            display:
              "inline-flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            gap: "5px",
            padding:
              "7px 9px",
            borderRadius:
              "7px",
            fontWeight:
              600,
            fontSize:
              "12px",
            cursor:
              "pointer",
            whiteSpace:
              "nowrap",
          };

        return (
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              flexWrap:
                "wrap",
              gap: "6px",
            }}
          >
            {/* =================================================
                PREVIEW
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                handlePreview(
                  row.id
                )
              }
              disabled={
                replacingId !==
                null
              }
              style={{
                ...actionButtonStyle,

                border:
                  "1px solid #bfdbfe",

                background:
                  "#eff6ff",

                color:
                  "#2563eb",

                opacity:
                  replacingId !==
                  null
                    ? 0.6
                    : 1,

                cursor:
                  replacingId !==
                  null
                    ? "not-allowed"
                    : "pointer",
              }}
              title="Preview evidence"
            >
              <Eye
                size={14}
              />

              Preview
            </button>

            {/* =================================================
                DOWNLOAD
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                handleDownload(
                  row.id,
                  row.title,
                  getFileType(row)
                )
              }
              disabled={
                replacingId !==
                null
              }
              style={{
                ...actionButtonStyle,

                border:
                  "1px solid #bbf7d0",

                background:
                  "#f0fdf4",

                color:
                  "#15803d",

                opacity:
                  replacingId !==
                  null
                    ? 0.6
                    : 1,

                cursor:
                  replacingId !==
                  null
                    ? "not-allowed"
                    : "pointer",
              }}
              title="Download evidence"
            >
              <Download
                size={14}
              />

              Download
            </button>

            {/* =================================================
                REPLACE
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                handleReplace(
                  row.id
                )
              }
              disabled={
                replacingId !==
                null
              }
              style={{
                ...actionButtonStyle,

                border:
                  "1px solid #c4b5fd",

                background:
                  isReplacing
                    ? "#ede9fe"
                    : "#f5f3ff",

                color:
                  "#6d28d9",

                cursor:
                  replacingId !==
                  null
                    ? "not-allowed"
                    : "pointer",

                opacity:
                  replacingId !==
                    null &&
                  !isReplacing
                    ? 0.5
                    : 1,
              }}
              title="Replace evidence"
            >
              <Replace
                size={14}
              />

              {isReplacing
                ? "Replacing..."
                : "Replace"}
            </button>
          </div>
        );
      },
    },
  ];

  // ============================================================
  // SUMMARY VALUES
  // ============================================================

  const totalEvidence =
    documents.length;

  const uploadedCount =
    documents.filter(
      (doc) =>
        (doc?.status ||
          "Uploaded") ===
        "Uploaded"
    ).length;

  const linkedSubmissionCount =
    new Set(
      documents
        .filter(
          (doc) =>
            doc?.submission_id
        )
        .map(
          (doc) =>
            doc.submission_id
        )
    ).size;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      style={{
        color: "#1e293b",
      }}
    >
      {/* ======================================================
          HIDDEN FILE INPUT
      ====================================================== */}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        onChange={
          handleReplacementFile
        }
        style={{
          display: "none",
        }}
      />

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <PageHeader
        eyebrow="EVIDENCE DOSSIER"
        title="Documents & Evidence Repository"
        description="Centralized repository of evidence files, supporting documents, and accreditation proofs."
        primaryAction={{
          label:
            "Upload Evidence File",
          icon: UploadCloud,
          onClick:
            handleUpload,
        }}
      />

      {/* ======================================================
          SUCCESS MESSAGE
      ====================================================== */}

      {successMessage && (
        <div
          style={{
            marginBottom:
              "16px",
            padding:
              "12px 16px",
            background:
              "#f0fdf4",
            border:
              "1px solid #bbf7d0",
            borderRadius:
              "8px",
            color:
              "#166534",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* ======================================================
          ERROR MESSAGE
      ====================================================== */}

      {error && (
        <div
          style={{
            marginBottom:
              "16px",
            padding:
              "12px 16px",
            background:
              "#fef2f2",
            border:
              "1px solid #fecaca",
            borderRadius:
              "8px",
            color:
              "#991b1b",

            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",

            gap: "12px",
          }}
        >
          <span>
            {error}
          </span>

          <button
            onClick={
              loadDocuments
            }
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "6px",

              padding:
                "7px 10px",

              border:
                "1px solid #fecaca",
              borderRadius:
                "6px",

              background:
                "#ffffff",
              color:
                "#991b1b",

              cursor:
                "pointer",
              fontWeight:
                600,
            }}
          >
            <RefreshCw
              size={14}
            />

            Retry
          </button>
        </div>
      )}

      {/* ======================================================
          REPLACEMENT PROGRESS
      ====================================================== */}

      {replacingId !== null && (
        <div
          style={{
            marginBottom:
              "16px",
            padding:
              "14px 16px",
            background:
              "#f5f3ff",
            border:
              "1px solid #ddd6fe",
            borderRadius:
              "8px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom:
                "8px",
              color:
                "#5b21b6",
              fontSize:
                "13px",
              fontWeight:
                600,
            }}
          >
            <span>
              Replacing
              evidence...
            </span>

            <span>
              {
                uploadProgress
              }
              %
            </span>
          </div>

          <div
            style={{
              width:
                "100%",
              height:
                "7px",
              background:
                "#ddd6fe",
              borderRadius:
                "999px",
              overflow:
                "hidden",
            }}
          >
            <div
              style={{
                width:
                  `${uploadProgress}%`,
                height:
                  "100%",
                background:
                  "#7c3aed",
                transition:
                  "width 0.2s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: "16px",
          marginBottom:
            "20px",
        }}
      >
        {/* TOTAL */}

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e2e8f0",
            borderRadius:
              "12px",
            padding:
              "18px",
          }}
        >
          <div
            style={{
              color:
                "#64748b",
              fontSize:
                "13px",
              marginBottom:
                "6px",
            }}
          >
            Total Evidence
          </div>

          <div
            style={{
              fontSize:
                "26px",
              fontWeight:
                700,
              color:
                "#1e293b",
            }}
          >
            {
              totalEvidence
            }
          </div>
        </div>

        {/* UPLOADED */}

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e2e8f0",
            borderRadius:
              "12px",
            padding:
              "18px",
          }}
        >
          <div
            style={{
              color:
                "#64748b",
              fontSize:
                "13px",
              marginBottom:
                "6px",
            }}
          >
            Uploaded
          </div>

          <div
            style={{
              fontSize:
                "26px",
              fontWeight:
                700,
              color:
                "#166534",
            }}
          >
            {
              uploadedCount
            }
          </div>
        </div>

        {/* LINKED SUBMISSIONS */}

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e2e8f0",
            borderRadius:
              "12px",
            padding:
              "18px",
          }}
        >
          <div
            style={{
              color:
                "#64748b",
              fontSize:
                "13px",
              marginBottom:
                "6px",
            }}
          >
            Linked Submissions
          </div>

          <div
            style={{
              fontSize:
                "26px",
              fontWeight:
                700,
              color:
                "#2563eb",
            }}
          >
            {
              linkedSubmissionCount
            }
          </div>
        </div>
      </div>

      {/* ======================================================
          EVIDENCE TABLE
      ====================================================== */}

      <div
        className="panel"
        style={{
          background:
            "#ffffff",
          border:
            "1px solid #e2e8f0",
          borderRadius:
            "12px",
          padding:
            "20px",
        }}
      >
        {/* TABLE HEADER */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom:
              "16px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize:
                  "18px",
              }}
            >
              Evidence Files
            </h2>

            <p
              style={{
                margin:
                  "5px 0 0",
                color:
                  "#64748b",
                fontSize:
                  "13px",
              }}
            >
              Real evidence
              files stored
              in the
              EduVerse
              backend.
            </p>
          </div>

          {/* REFRESH */}

          <button
            onClick={
              loadDocuments
            }
            disabled={
              loading
            }
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "7px",

              padding:
                "8px 12px",

              border:
                "1px solid #cbd5e1",
              borderRadius:
                "7px",

              background:
                "#ffffff",
              color:
                "#334155",

              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",

              fontWeight:
                600,
            }}
          >
            <RefreshCw
              size={15}
              style={{
                animation:
                  loading
                    ? "spin 1s linear infinite"
                    : "none",
              }}
            />

            Refresh
          </button>
        </div>

        {/* ====================================================
            LOADING
        ==================================================== */}

        {loading ? (
          <div
            style={{
              padding:
                "50px 20px",
              textAlign:
                "center",
              color:
                "#64748b",
            }}
          >
            Loading
            evidence
            files...
          </div>
        ) : (
          /* ==================================================
             TABLE
          ================================================== */

          <DataTable
            columns={
              columns
            }
            data={
              documents
            }
            keyField="id"
            emptyMessage="No evidence documents uploaded yet."
          />
        )}
      </div>
    </div>
  );
};

export default Documents;