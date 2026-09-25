import React, {
  useEffect,
  useMemo,
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
  useSearchParams,
} from "react-router-dom";

import criteriaService from "../services/criteriaService";
import submissionService from "../services/submissionService";
import documentService from "../services/documentService";

// ============================================================
// CONSTANTS
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

const EDITABLE_STATUSES = new Set([
  "draft",
  "changes requested",
  "resubmitted",
]);

// ============================================================
// HELPERS
// ============================================================

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const isEditableStatus = (status) =>
  EDITABLE_STATUSES.has(
    normalizeText(status)
  );

const getErrorMessage = (
  error,
  fallback
) => {
  const detail =
    error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
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

const formatBytes = (bytes) => {
  if (!bytes) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`;
};

// ============================================================
// COMPONENT
// ============================================================

const EvidenceUpload = () => {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  // ==========================================================
  // URL PARAMETERS
  // ==========================================================

  const urlSubmissionId =
    searchParams.get(
      "submission_id"
    );

  const urlCriterionId =
    searchParams.get(
      "criterion_id"
    );

  const urlMetricId =
    searchParams.get(
      "metric_id"
    );

  // ==========================================================
  // DATA
  // ==========================================================

  const [criteria, setCriteria] =
    useState([]);

  const [sections, setSections] =
    useState([]);

  const [metrics, setMetrics] =
    useState([]);

  const [
    evidenceRequirements,
    setEvidenceRequirements,
  ] = useState([]);

  const [
    submissions,
    setSubmissions,
  ] = useState([]);

  const [
    documents,
    setDocuments,
  ] = useState([]);

  // ==========================================================
  // SELECTIONS
  // ==========================================================

  const [
    selectedCriterionId,
    setSelectedCriterionId,
  ] = useState(
    urlCriterionId || ""
  );

  const [
    selectedMetricId,
    setSelectedMetricId,
  ] = useState(
    urlMetricId || ""
  );

  const [
    selectedSubmissionId,
    setSelectedSubmissionId,
  ] = useState(
    urlSubmissionId || ""
  );

  // ==========================================================
  // FILE
  // ==========================================================

  const [file, setFile] =
    useState(null);

  const [
    dragActive,
    setDragActive,
  ] = useState(false);

  // ==========================================================
  // UI
  // ==========================================================

  const [loading, setLoading] =
    useState(true);

  const [
    loadingMetrics,
    setLoadingMetrics,
  ] = useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(0);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    uploadedDocument,
    setUploadedDocument,
  ] = useState(null);

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          criteriaData,
          metricsData,
          evidenceData,
          submissionsData,
          documentsData,
        ] = await Promise.all([
          criteriaService.getCriteria(),
          criteriaService.getMetrics(),
          criteriaService.getEvidenceRequirements(),
          submissionService.getSubmissions(),
          documentService.getDocuments(),
        ]);

        const safeCriteria =
          Array.isArray(criteriaData)
            ? criteriaData
            : [];

        const safeMetrics =
          Array.isArray(metricsData)
            ? metricsData
            : [];

        const safeEvidence =
          Array.isArray(evidenceData)
            ? evidenceData
            : [];

        const safeSubmissions =
          Array.isArray(
            submissionsData
          )
            ? submissionsData
            : [];

        const safeDocuments =
          Array.isArray(
            documentsData
          )
            ? documentsData
            : [];

        console.log(
          "EVIDENCE UPLOAD - CRITERIA:",
          safeCriteria
        );

        console.log(
          "EVIDENCE UPLOAD - METRICS:",
          safeMetrics
        );

        console.log(
          "EVIDENCE UPLOAD - SUBMISSIONS:",
          safeSubmissions
        );

        console.log(
          "EVIDENCE UPLOAD - DOCUMENTS:",
          safeDocuments
        );

        console.log(
          "EVIDENCE UPLOAD - URL SUBMISSION ID:",
          urlSubmissionId
        );

        console.log(
          "EVIDENCE UPLOAD - URL CRITERION ID:",
          urlCriterionId
        );

        console.log(
          "EVIDENCE UPLOAD - URL METRIC ID:",
          urlMetricId
        );

        // ======================================================
        // IMPORTANT SUBMISSION DEBUG
        // ======================================================

        safeSubmissions.forEach(
          (submission) => {
            console.log(
              "SUBMISSION CHECK:",
              {
                id: submission.id,

                title:
                  submission.title,

                metric_id:
                  submission.metric_id,

                metricId:
                  submission.metricId,

                metric_code:
                  submission.metric_code,

                metricCode:
                  submission.metricCode,

                criterion_id:
                  submission.criterion_id,

                department_id:
                  submission.department_id,

                institution_id:
                  submission.institution_id,

                status:
                  submission.status,

                created_at:
                  submission.created_at,

                createdAt:
                  submission.createdAt,
              }
            );
          }
        );

        // ======================================================
        // URL SUBMISSION DEBUG
        // ======================================================

        if (urlSubmissionId) {
          const foundSubmission =
            safeSubmissions.find(
              (submission) =>
                String(
                  submission.id
                ) ===
                String(
                  urlSubmissionId
                )
            );

          console.log(
            "EVIDENCE UPLOAD - URL SUBMISSION FOUND:",
            foundSubmission
          );
        }

        setCriteria(
          safeCriteria
        );

        setMetrics(
          safeMetrics
        );

        setEvidenceRequirements(
          safeEvidence
        );

        setSubmissions(
          safeSubmissions
        );

        setDocuments(
          safeDocuments
        );
      } catch (err) {
        console.error(
          "EVIDENCE UPLOAD - LOAD ERROR:",
          err?.response?.data ||
            err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to load evidence upload data."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    urlSubmissionId,
    urlCriterionId,
    urlMetricId,
  ]);

  // ==========================================================
  // URL SUBMISSION
  // ==========================================================

  const urlSubmission =
    useMemo(() => {
      if (!urlSubmissionId) {
        return null;
      }

      return submissions.find(
        (submission) =>
          String(
            submission.id
          ) ===
          String(
            urlSubmissionId
          )
      );
    }, [
      submissions,
      urlSubmissionId,
    ]);

  // ==========================================================
  // LOG URL SUBMISSION
  // ==========================================================

  useEffect(() => {
    console.log(
      "EVIDENCE UPLOAD - URL SUBMISSION OBJECT:",
      urlSubmission
    );
  }, [urlSubmission]);

  // ==========================================================
  // AUTO SELECT URL SUBMISSION
  // ==========================================================

  useEffect(() => {
    if (!urlSubmission) {
      return;
    }

    console.log(
      "EVIDENCE UPLOAD - AUTO SELECTING SUBMISSION:",
      urlSubmission
    );

    setSelectedSubmissionId(
      String(
        urlSubmission.id
      )
    );

    if (urlMetricId) {
      setSelectedMetricId(
        String(urlMetricId)
      );
    } else {
      const matchingMetric =
        metrics.find(
          (metric) =>
            normalizeText(
              metric.code
            ) ===
            normalizeText(
              urlSubmission.metric_code
            )
        );

      if (matchingMetric) {
        setSelectedMetricId(
          String(
            matchingMetric.id
          )
        );
      }
    }

    if (urlCriterionId) {
      setSelectedCriterionId(
        String(urlCriterionId)
      );
    }
  }, [
    urlSubmission,
    metrics,
    urlMetricId,
    urlCriterionId,
  ]);

  // ==========================================================
  // FIND CRITERION FROM METRIC
  // ==========================================================

  useEffect(() => {
    const findCriterion =
      async () => {
        if (
          !selectedMetricId ||
          !metrics.length ||
          !criteria.length
        ) {
          return;
        }

        if (selectedCriterionId) {
          return;
        }

        const metric =
          metrics.find(
            (item) =>
              String(item.id) ===
              String(
                selectedMetricId
              )
          );

        if (!metric) {
          return;
        }

        try {
          for (
            const criterion of criteria
          ) {
            const sectionData =
              await criteriaService.getSections(
                Number(
                  criterion.id
                )
              );

            const sectionIds =
              Array.isArray(
                sectionData
              )
                ? sectionData.map(
                    (section) =>
                      Number(
                        section.id
                      )
                  )
                : [];

            if (
              sectionIds.includes(
                Number(
                  metric.section_id
                )
              )
            ) {
              setSelectedCriterionId(
                String(
                  criterion.id
                )
              );

              break;
            }
          }
        } catch (err) {
          console.error(
            "FIND CRITERION ERROR:",
            err?.response?.data ||
              err
          );
        }
      };

    findCriterion();
  }, [
    selectedMetricId,
    selectedCriterionId,
    metrics,
    criteria,
  ]);

  // ==========================================================
  // LOAD SECTIONS
  // ==========================================================

  useEffect(() => {
    const loadSections =
      async () => {
        if (!selectedCriterionId) {
          setSections([]);
          return;
        }

        try {
          setLoadingMetrics(true);

          const data =
            await criteriaService.getSections(
              Number(
                selectedCriterionId
              )
            );

          const safeSections =
            Array.isArray(data)
              ? data
              : [];

          console.log(
            "EVIDENCE UPLOAD - SECTIONS:",
            safeSections
          );

          setSections(
            safeSections
          );
        } catch (err) {
          console.error(
            "LOAD SECTIONS ERROR:",
            err?.response?.data ||
              err
          );

          setSections([]);

          setError(
            getErrorMessage(
              err,
              "Unable to load sections."
            )
          );
        } finally {
          setLoadingMetrics(false);
        }
      };

    loadSections();
  }, [
    selectedCriterionId,
  ]);

  // ==========================================================
  // AVAILABLE METRICS
  // ==========================================================

  const availableMetrics =
    useMemo(() => {
      if (!selectedCriterionId) {
        return [];
      }

      const sectionIds =
        new Set(
          sections.map(
            (section) =>
              Number(section.id)
          )
        );

      return metrics.filter(
        (metric) =>
          sectionIds.has(
            Number(
              metric.section_id
            )
          )
      );
    }, [
      selectedCriterionId,
      sections,
      metrics,
    ]);

  // ==========================================================
  // SELECTED METRIC
  // ==========================================================

  const selectedMetric =
    useMemo(() => {
      return metrics.find(
        (metric) =>
          String(metric.id) ===
          String(
            selectedMetricId
          )
      );
    }, [
      metrics,
      selectedMetricId,
    ]);

  // ==========================================================
  // DEBUG SELECTED METRIC
  // ==========================================================

  useEffect(() => {
    console.log(
      "EVIDENCE UPLOAD - SELECTED METRIC:",
      selectedMetric
    );

    console.log(
      "EVIDENCE UPLOAD - SELECTED METRIC ID:",
      selectedMetricId
    );
  }, [
    selectedMetric,
    selectedMetricId,
  ]);

  // ==========================================================
  // EVIDENCE REQUIREMENT
  // ==========================================================

  const selectedEvidenceRequirement =
    useMemo(() => {
      if (!selectedMetricId) {
        return null;
      }

      return (
        evidenceRequirements.find(
          (requirement) =>
            String(
              requirement.metric_id
            ) ===
            String(
              selectedMetricId
            )
        ) || null
      );
    }, [
      evidenceRequirements,
      selectedMetricId,
    ]);

  // ==========================================================
  // EDITABLE SUBMISSIONS
  // ==========================================================

  const editableSubmissions =
    useMemo(() => {
      if (!selectedMetric) {
        console.log(
          "EDITABLE SUBMISSIONS: No selected metric"
        );

        return [];
      }

      console.log(
        "EDITABLE SUBMISSIONS - CHECKING METRIC:",
        {
          id: selectedMetric.id,
          code: selectedMetric.code,
          title: selectedMetric.title,
        }
      );

      const result =
        submissions.filter(
          (submission) => {
            const submissionMetricId =
              submission.metric_id ??
              submission.metricId;

            const submissionMetricCode =
              submission.metric_code ??
              submission.metricCode;

            const sameMetricById =
              submissionMetricId !=
                null &&
              String(
                submissionMetricId
              ) ===
                String(
                  selectedMetric.id
                );

            const sameMetricByCode =
              normalizeText(
                submissionMetricCode
              ) ===
              normalizeText(
                selectedMetric.code
              );

            const sameMetric =
              sameMetricById ||
              sameMetricByCode;

            const editable =
              isEditableStatus(
                submission.status
              );

            console.log(
              "SUBMISSION MATCH RESULT:",
              {
                submissionId:
                  submission.id,

                submissionMetricId,

                submissionMetricCode,

                selectedMetricId:
                  selectedMetric.id,

                selectedMetricCode:
                  selectedMetric.code,

                sameMetricById,

                sameMetricByCode,

                sameMetric,

                status:
                  submission.status,

                editable,
              }
            );

            return (
              sameMetric &&
              editable
            );
          }
        );

      console.log(
        "EDITABLE SUBMISSIONS RESULT:",
        result
      );

      return result;
    }, [
      submissions,
      selectedMetric,
    ]);

  // ==========================================================
  // SELECTED SUBMISSION
  // ==========================================================

  const selectedSubmission =
    useMemo(() => {
      const submission =
        submissions.find(
          (item) =>
            String(
              item.id
            ) ===
            String(
              selectedSubmissionId
            )
        );

      console.log(
        "SELECTED SUBMISSION:",
        submission
      );

      return submission;
    }, [
      submissions,
      selectedSubmissionId,
    ]);

  // ==========================================================
  // EXISTING DOCUMENT COUNT
  // ==========================================================

  const existingFileCount =
    useMemo(() => {
      if (!selectedSubmissionId) {
        return 0;
      }

      return documents.filter(
        (document) =>
          String(
            document.submission_id
          ) ===
          String(
            selectedSubmissionId
          )
      ).length;
    }, [
      documents,
      selectedSubmissionId,
    ]);

  // ==========================================================
  // ALLOWED FILE TYPES
  // ==========================================================

  const allowedExtensions =
    useMemo(() => {
      if (
        !selectedEvidenceRequirement ||
        !selectedEvidenceRequirement.allowed_file_types
      ) {
        return ALLOWED_EXTENSIONS;
      }

      return String(
        selectedEvidenceRequirement.allowed_file_types
      )
        .split(",")
        .map((item) =>
          item
            .trim()
            .toLowerCase()
            .replace(".", "")
        )
        .filter(Boolean);
    }, [
      selectedEvidenceRequirement,
    ]);

  const acceptAttribute =
    allowedExtensions
      .map(
        (extension) =>
          `.${extension}`
      )
      .join(",");

  // ==========================================================
  // CRITERION CHANGE
  // ==========================================================

  const handleCriterionChange = (
    event
  ) => {
    const value =
      event.target.value;

    setSelectedCriterionId(
      value
    );

    setSelectedMetricId("");
    setSelectedSubmissionId("");

    setFile(null);
    setError("");
    setMessage("");
    setUploadedDocument(null);
    setUploadProgress(0);
  };

  // ==========================================================
  // METRIC CHANGE
  // ==========================================================

  const handleMetricChange = (
    event
  ) => {
    const value =
      event.target.value;

    setSelectedMetricId(
      value
    );

    setSelectedSubmissionId("");

    setFile(null);
    setError("");
    setMessage("");
    setUploadedDocument(null);
    setUploadProgress(0);
  };

  // ==========================================================
  // SUBMISSION CHANGE
  // ==========================================================

  const handleSubmissionChange = (
    event
  ) => {
    const value =
      event.target.value;

    console.log(
      "SUBMISSION SELECTED:",
      value
    );

    setSelectedSubmissionId(
      value
    );

    setFile(null);
    setError("");
    setMessage("");
    setUploadedDocument(null);
    setUploadProgress(0);
  };

  // ==========================================================
  // VALIDATE FILE
  // ==========================================================

  const validateFile = (
    selectedFile
  ) => {
    if (!selectedFile) {
      return "Please select a file.";
    }

    const extension =
      selectedFile.name
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
      !extension ||
      !allowedExtensions.includes(
        extension
      )
    ) {
      return (
        `File type '.${extension || ""}' ` +
        "is not allowed for this evidence requirement."
      );
    }

    const maxFiles =
      selectedEvidenceRequirement
        ?.max_files || 5;

    if (
      existingFileCount >=
      Number(maxFiles)
    ) {
      return (
        `Maximum of ${maxFiles} evidence files are already uploaded.`
      );
    }

    return "";
  };

  // ==========================================================
  // FILE SELECT
  // ==========================================================

  const handleFileSelect = (
    selectedFile
  ) => {
    setError("");
    setMessage("");
    setUploadedDocument(null);
    setUploadProgress(0);

    const validationError =
      validateFile(
        selectedFile
      );

    if (validationError) {
      setFile(null);
      setError(
        validationError
      );
      return;
    }

    setFile(
      selectedFile
    );
  };

  // ==========================================================
  // FILE INPUT
  // ==========================================================

  const handleFileInputChange = (
    event
  ) => {
    const selectedFile =
      event.target.files?.[0];

    handleFileSelect(
      selectedFile
    );

    event.target.value = "";
  };

  // ==========================================================
  // DRAG EVENTS
  // ==========================================================

  const handleDragOver = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!uploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);
  };

  const handleDrop = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    if (uploading) {
      return;
    }

    const droppedFile =
      event.dataTransfer
        .files?.[0];

    handleFileSelect(
      droppedFile
    );
  };

  // ==========================================================
  // REFRESH DOCUMENTS
  // ==========================================================

  const refreshDocuments =
    async () => {
      try {
        const data =
          await documentService.getDocuments();

        setDocuments(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          "REFRESH DOCUMENTS ERROR:",
          err?.response?.data ||
            err
        );
      }
    };

  // ==========================================================
  // UPLOAD EVIDENCE
  // ==========================================================

  const handleUpload = async () => {
    setError("");
    setMessage("");
    setUploadedDocument(null);

    console.log(
      "UPLOAD START DATA:",
      {
        criterionId:
          selectedCriterionId,

        metricId:
          selectedMetricId,

        metricCode:
          selectedMetric?.code,

        submissionId:
          selectedSubmissionId,

        submission:
          selectedSubmission,

        file,
      }
    );

    if (!selectedCriterionId) {
      setError(
        "Please select a criterion."
      );
      return;
    }

    if (!selectedMetricId) {
      setError(
        "Please select a metric."
      );
      return;
    }

    if (!selectedEvidenceRequirement) {
      setError(
        "No evidence requirement is configured for this metric."
      );
      return;
    }

    if (!selectedSubmissionId) {
      setError(
        "Please select an editable submission."
      );
      return;
    }

    if (!selectedSubmission) {
      setError(
        "Selected submission could not be found."
      );
      return;
    }

    if (
      !isEditableStatus(
        selectedSubmission.status
      )
    ) {
      setError(
        `Submission #${selectedSubmission.id} is not editable because its status is "${selectedSubmission.status}".`
      );
      return;
    }

    if (!file) {
      setError(
        "Please select an evidence file."
      );
      return;
    }

    const validationError =
      validateFile(file);

    if (validationError) {
      setError(
        validationError
      );
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const metricCode =
        selectedMetric?.code ||
        selectedSubmission.metric_code ||
        "Evidence";

      const title =
        `${metricCode} - ${file.name}`;

      const result =
        await documentService.uploadEvidence(
          file,
          selectedSubmission.id,
          title,
          (progressEvent) => {
            if (
              progressEvent.total
            ) {
              const percentage =
                Math.round(
                  (
                    progressEvent.loaded /
                    progressEvent.total
                  ) *
                    100
                );

              setUploadProgress(
                Math.min(
                  percentage,
                  100
                )
              );
            }
          }
        );

      console.log(
        "EVIDENCE UPLOAD RESPONSE:",
        result
      );

      setUploadedDocument(
        result
      );

      setMessage(
        `Evidence uploaded successfully and attached to Submission #${selectedSubmission.id}.`
      );

      setFile(null);
      setUploadProgress(100);

      await refreshDocuments();
    } catch (err) {
      console.error(
        "EVIDENCE UPLOAD ERROR:",
        err?.response?.data ||
          err
      );

      setUploadProgress(0);

      setError(
        getErrorMessage(
          err,
          "Unable to upload evidence."
        )
      );
    } finally {
      setUploading(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          color: "#1e293b",
        }}
      >
        Loading evidence upload...
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      style={{
        maxWidth: "1000px",
        color: "#1e293b",
      }}
    >
      {/* BACK */}

      <button
        onClick={() =>
          navigate("/documents")
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
        Back to Evidence Repository
      </button>

      {/* HEADER */}

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
          EVIDENCE DOSSIER
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "25px",
          }}
        >
          Upload Evidence
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            opacity: 0.85,
            fontSize: "14px",
          }}
        >
          Link a real supporting
          document to an editable
          NAAC metric submission.
        </p>
      </div>

      {/* URL SUBMISSION */}

      {urlSubmission && (
        <div
          style={{
            marginBottom: "18px",
            padding: "16px 18px",
            border:
              "1px solid #bfdbfe",
            background: "#eff6ff",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              color: "#1d4ed8",
              fontWeight: 700,
              marginBottom: "6px",
            }}
          >
            <FileText size={18} />

            Evidence for Submission #
            {urlSubmission.id}
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#475569",
            }}
          >
            {urlSubmission.title}
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            Status:{" "}
            <strong>
              {urlSubmission.status}
            </strong>
          </div>
        </div>
      )}

      {/* URL NOT FOUND */}

      {urlSubmissionId &&
        !urlSubmission && (
          <div
            style={{
              marginBottom: "16px",
              padding: "13px 15px",
              border:
                "1px solid #fde68a",
              background: "#fffbeb",
              color: "#92400e",
              borderRadius: "9px",
              fontSize: "13px",
            }}
          >
            Submission #
            {urlSubmissionId} was not
            returned by the submissions
            API.
          </div>
        )}

      {/* ERROR */}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems:
              "flex-start",
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
          />

          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS */}

      {message && (
        <div
          style={{
            display: "flex",
            alignItems:
              "flex-start",
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
          <CheckCircle
            size={18}
          />

          <span>{message}</span>
        </div>
      )}

      {/* ======================================================
          1. CRITERION
      ====================================================== */}

      <div style={cardStyle}>
        <SectionHeading
          number="1"
          title="Select Criterion"
          description="Choose the NAAC criterion containing the metric."
        />

        <select
          value={
            selectedCriterionId
          }
          onChange={
            handleCriterionChange
          }
          disabled={
            uploading ||
            Boolean(urlSubmission)
          }
          style={inputStyle}
        >
          <option value="">
            Select Criterion
          </option>

          {criteria.map(
            (criterion) => (
              <option
                key={criterion.id}
                value={criterion.id}
              >
                {criterion.number} -{" "}
                {criterion.title}
              </option>
            )
          )}
        </select>
      </div>

      {/* ======================================================
          2. METRIC
      ====================================================== */}

      <div style={cardStyle}>
        <SectionHeading
          number="2"
          title="Select Metric"
          description="Select the metric to which this evidence belongs."
        />

        <select
          value={
            selectedMetricId
          }
          onChange={
            handleMetricChange
          }
          disabled={
            !selectedCriterionId ||
            loadingMetrics ||
            uploading ||
            Boolean(urlSubmission)
          }
          style={inputStyle}
        >
          <option value="">
            {loadingMetrics
              ? "Loading metrics..."
              : !selectedCriterionId
              ? "Select a criterion first"
              : availableMetrics.length ===
                0
              ? "No metrics available"
              : "Select Metric"}
          </option>

          {availableMetrics.map(
            (metric) => (
              <option
                key={metric.id}
                value={metric.id}
              >
                {metric.code} -{" "}
                {metric.title}
              </option>
            )
          )}
        </select>

        {selectedMetric && (
          <div
            style={{
              marginTop: "14px",
              padding: "14px",
              background:
                "#f8fafc",
              border:
                "1px solid #e2e8f0",
              borderRadius: "9px",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: "5px",
              }}
            >
              {selectedMetric.code}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              {selectedMetric.description ||
                selectedMetric.title}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          3. EVIDENCE REQUIREMENT
      ====================================================== */}

      {selectedMetric && (
        <div style={cardStyle}>
          <SectionHeading
            number="3"
            title="Evidence Requirement"
            description="These rules come directly from the configured NAAC evidence requirement."
          />

          {selectedEvidenceRequirement ? (
            <div
              style={{
                border:
                  "1px solid #dbeafe",
                background:
                  "#eff6ff",
                borderRadius: "10px",
                padding: "17px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "16px",
                }}
              >
                {
                  selectedEvidenceRequirement.title
                }
              </div>

              {selectedEvidenceRequirement.description && (
                <div
                  style={{
                    color: "#475569",
                    fontSize: "13px",
                    marginTop: "7px",
                  }}
                >
                  {
                    selectedEvidenceRequirement.description
                  }
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginTop: "14px",
                  color: "#475569",
                  fontSize: "13px",
                }}
              >
                <span>
                  <strong>
                    Allowed:
                  </strong>{" "}
                  {allowedExtensions
                    .map(
                      (item) =>
                        item.toUpperCase()
                    )
                    .join(", ")}
                </span>

                <span>
                  <strong>
                    Maximum files:
                  </strong>{" "}
                  {
                    selectedEvidenceRequirement.max_files
                  }
                </span>

                <span>
                  <strong>
                    Existing:
                  </strong>{" "}
                  {existingFileCount}
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "16px",
                background:
                  "#fffbeb",
                border:
                  "1px solid #fde68a",
                borderRadius: "9px",
                color: "#92400e",
              }}
            >
              No evidence requirement
              is configured for this
              metric.
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          4. SUBMISSION
      ====================================================== */}

      {selectedMetric && (
        <div style={cardStyle}>
          <SectionHeading
            number="4"
            title="Select Submission"
            description="Evidence is attached to an editable submission."
          />

          <select
            value={
              selectedSubmissionId
            }
            onChange={
              handleSubmissionChange
            }
            disabled={
              uploading ||
              Boolean(urlSubmission)
            }
            style={inputStyle}
          >
            <option value="">
              Select Editable
              Submission
            </option>

            {editableSubmissions.map(
              (submission) => (
                <option
                  key={submission.id}
                  value={submission.id}
                >
                  Submission #
                  {submission.id} —{" "}
                  {submission.status} —{" "}
                  {submission.title}
                </option>
              )
            )}
          </select>

          {editableSubmissions.length ===
            0 &&
            !urlSubmission && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "13px",
                  background:
                    "#f8fafc",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "4px",
                  }}
                >
                  No editable submission
                  exists for this metric.
                </div>

                <div>
                  Create a Draft
                  submission first from
                  the metric page.
                </div>
              </div>
            )}

          {selectedSubmission && (
            <div
              style={{
                marginTop: "14px",
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: "10px",
              }}
            >
              <MiniInfo
                label="Submission"
                value={`#${selectedSubmission.id}`}
              />

              <MiniInfo
                label="Status"
                value={
                  selectedSubmission.status
                }
              />

              <MiniInfo
                label="Files"
                value={
                  existingFileCount
                }
              />
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          5. UPLOAD
      ====================================================== */}

      {selectedSubmission &&
        isEditableStatus(
          selectedSubmission.status
        ) && (
          <div style={cardStyle}>
            <SectionHeading
              number="5"
              title="Upload Evidence"
              description="Upload the real supporting document and attach it to this submission."
            />

            <div
              onDragOver={
                handleDragOver
              }
              onDragLeave={
                handleDragLeave
              }
              onDrop={handleDrop}
              style={{
                border:
                  dragActive
                    ? "2px solid #2563eb"
                    : "2px dashed #cbd5e1",
                borderRadius: "12px",
                padding:
                  "34px 20px",
                textAlign: "center",
                background:
                  dragActive
                    ? "#eff6ff"
                    : "#f8fafc",
              }}
            >
              <UploadCloud
                size={38}
                color="#2563eb"
              />

              <div
                style={{
                  fontWeight: 700,
                  fontSize: "16px",
                  marginTop: "10px",
                }}
              >
                Drag & drop your
                evidence file here
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  margin:
                    "7px 0 16px",
                }}
              >
                or choose a file from
                your computer
              </div>

              <label
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: "7px",
                  padding:
                    "10px 16px",
                  borderRadius: "8px",
                  background:
                    uploading
                      ? "#94a3b8"
                      : "#2563eb",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor:
                    uploading
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <FileText size={16} />

                Choose File

                <input
                  type="file"
                  accept={
                    acceptAttribute
                  }
                  disabled={
                    uploading
                  }
                  onChange={
                    handleFileInputChange
                  }
                  style={{
                    display: "none",
                  }}
                />
              </label>

              <div
                style={{
                  marginTop: "14px",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                Allowed formats:{" "}
                {allowedExtensions
                  .map(
                    (item) =>
                      item.toUpperCase()
                  )
                  .join(", ")}
              </div>
            </div>

            {file && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "14px",
                  border:
                    "1px solid #dbeafe",
                  background:
                    "#eff6ff",
                  borderRadius: "9px",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "10px",
                  }}
                >
                  <FileText
                    size={20}
                    color="#2563eb"
                  />

                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {file.name}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      {formatBytes(
                        file.size
                      )}
                    </div>
                  </div>
                </div>

                {!uploading && (
                  <button
                    onClick={() => {
                      setFile(null);
                      setError("");
                      setUploadProgress(
                        0
                      );
                    }}
                    style={{
                      border: "none",
                      background:
                        "transparent",
                      color:
                        "#64748b",
                      cursor:
                        "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}

            {uploading && (
              <div
                style={{
                  marginTop: "18px",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    marginBottom: "7px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  <span>
                    Uploading evidence...
                  </span>

                  <span>
                    {uploadProgress}%
                  </span>
                </div>

                <div
                  style={{
                    height: "9px",
                    background:
                      "#e2e8f0",
                    borderRadius:
                      "999px",
                    overflow:
                      "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${uploadProgress}%`,
                      height: "100%",
                      background:
                        "#2563eb",
                    }}
                  />
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: "20px",
                display:
                  "flex",
                justifyContent:
                  "flex-end",
              }}
            >
              <button
                onClick={
                  handleUpload
                }
                disabled={
                  uploading ||
                  !file ||
                  !selectedSubmission ||
                  !selectedEvidenceRequirement
                }
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "8px",
                  padding:
                    "11px 19px",
                  border: "none",
                  borderRadius:
                    "8px",
                  background:
                    uploading ||
                    !file ||
                    !selectedSubmission ||
                    !selectedEvidenceRequirement
                      ? "#cbd5e1"
                      : "#0f766e",
                  color:
                    "#ffffff",
                  cursor:
                    uploading ||
                    !file ||
                    !selectedSubmission ||
                    !selectedEvidenceRequirement
                      ? "not-allowed"
                      : "pointer",
                  fontWeight:
                    700,
                }}
              >
                <UploadCloud
                  size={17}
                />

                {uploading
                  ? "Uploading..."
                  : "Upload Evidence"}
              </button>
            </div>
          </div>
        )}

      {/* ======================================================
          SUCCESS
      ====================================================== */}

      {uploadedDocument && (
        <div
          style={{
            marginTop: "20px",
            padding: "18px",
            background:
              "#f0fdf4",
            border:
              "1px solid #bbf7d0",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "9px",
              color:
                "#166534",
              fontWeight:
                700,
            }}
          >
            <CheckCircle
              size={19}
            />

            Evidence uploaded
            successfully
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize:
                "13px",
              color:
                "#475569",
            }}
          >
            {
              uploadedDocument.title
            }
          </div>

          <div
            style={{
              marginTop: "6px",
              fontSize:
                "12px",
              color:
                "#64748b",
            }}
          >
            Document ID: #
            {
              uploadedDocument.id
            }
          </div>

          <div
            style={{
              marginTop: "6px",
              fontSize:
                "12px",
              color:
                "#64748b",
            }}
          >
            Attached to Submission #
            {
              selectedSubmission?.id
            }
          </div>

          <button
            onClick={() =>
              navigate(
                "/documents"
              )
            }
            style={{
              marginTop: "14px",
              padding:
                "8px 13px",
              border:
                "1px solid #bbf7d0",
              borderRadius:
                "7px",
              background:
                "#ffffff",
              color:
                "#166534",
              cursor:
                "pointer",
              fontWeight:
                600,
            }}
          >
            View Evidence
            Repository
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================
// SECTION HEADING
// ============================================================

const SectionHeading = ({
  number,
  title,
  description,
}) => (
  <div
    style={{
      display:
        "flex",
      gap: "12px",
      marginBottom:
        "17px",
    }}
  >
    <div
      style={{
        width: "30px",
        height: "30px",
        borderRadius:
          "50%",
        background:
          "#eff6ff",
        color:
          "#2563eb",
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        fontWeight:
          700,
        fontSize:
          "13px",
        flexShrink: 0,
      }}
    >
      {number}
    </div>

    <div>
      <h2
        style={{
          margin: 0,
          fontSize:
            "18px",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin:
            "4px 0 0",
          color:
            "#64748b",
          fontSize:
            "13px",
        }}
      >
        {description}
      </p>
    </div>
  </div>
);

// ============================================================
// MINI INFO
// ============================================================

const MiniInfo = ({
  label,
  value,
}) => (
  <div
    style={{
      background:
        "#f8fafc",
      borderRadius:
        "8px",
      padding:
        "11px",
    }}
  >
    <div
      style={{
        color:
          "#64748b",
        fontSize:
          "11px",
        marginBottom:
          "3px",
      }}
    >
      {label}
    </div>

    <strong
      style={{
        fontSize:
          "14px",
      }}
    >
      {value}
    </strong>
  </div>
);

// ============================================================
// STYLES
// ============================================================

const cardStyle = {
  background:
    "#ffffff",
  border:
    "1px solid #e2e8f0",
  borderRadius:
    "12px",
  padding:
    "22px",
  marginBottom:
    "18px",
};

const inputStyle = {
  width:
    "100%",
  boxSizing:
    "border-box",
  padding:
    "11px 13px",
  border:
    "1px solid #cbd5e1",
  borderRadius:
    "8px",
  background:
    "#ffffff",
  color:
    "#1e293b",
  fontSize:
    "14px",
  outline:
    "none",
};

export default EvidenceUpload;